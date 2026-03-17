using Microsoft.EntityFrameworkCore;
using SafeSend.Stock.Api.Data;
using SafeSend.Stock.Api.Models;

namespace SafeSend.Stock.Api.Services;

public sealed class TradingEligibilityService
{
    private readonly ApplicationDbContext _db;

    public TradingEligibilityService(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Returns (Allowed, Status, Message). Caller decides whether to return 403.
    /// </summary>
    public async Task<(bool Allowed, KycStatus? Status, string Message)> CanTradeAsync(
        string userId,
        CancellationToken ct)
    {
        var status = await _db.KycProfiles
            .AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => (KycStatus?)p.Status)
            .FirstOrDefaultAsync(ct);

        if (status is null)
            return (false, null, "You must complete identity verification (KYC) before you can trade.");

        if (status != KycStatus.Approved)
        {
            var msg = status switch
            {
                KycStatus.Draft => "Your KYC is incomplete. Please finish and submit it to enable trading.",
                KycStatus.Submitted => "Your KYC is under review. Trading will unlock after approval.",
                KycStatus.Rejected => "Your KYC was rejected. Please update your details/documents and resubmit.",
                _ => $"Your KYC status is '{status}'. Trading requires approval."
            };

            return (false, status, msg);
        }

        return (true, status, "OK");
    }

    /// <summary>
    /// Convenience: throws InvalidOperationException if not allowed (useful in services).
    /// </summary>
    public async Task EnsureCanTradeAsync(string userId, CancellationToken ct)
    {
        var (allowed, _, msg) = await CanTradeAsync(userId, ct);
        if (!allowed)
            throw new InvalidOperationException(msg);
    }
}