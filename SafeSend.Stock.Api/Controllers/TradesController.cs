using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SafeSend.Stock.Api.Contracts;
using SafeSend.Stock.Api.Data;
using SafeSend.Stock.Api.Models;
using SafeSend.Stock.Api.Services;

namespace SafeSend.Stock.Api.Controllers;

[ApiController]
[Route("api/trades")]
[Authorize]
public sealed class TradesController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly MarketFluctuationService _fluctuation;

    public TradesController(ApplicationDbContext db, MarketFluctuationService fluctuation)
    {
        _db = db;
        _fluctuation = fluctuation;
    }

    [HttpPost("buy")]
    public Task<ActionResult<TradeResponse>> Buy(TradeRequest request, CancellationToken ct)
        => ExecuteTrade(request, TradeSide.Buy, ct);

    [HttpPost("sell")]
    public Task<ActionResult<TradeResponse>> Sell(TradeRequest request, CancellationToken ct)
        => ExecuteTrade(request, TradeSide.Sell, ct);

    [HttpGet("me")]
    public async Task<ActionResult<List<TradeResponse>>> MyTrades(CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(Problem(title: "Unauthorized", detail: "Missing user id claim."));

        var isAdmin = User.IsInRole("Admin");

        if (!isAdmin)
        {
            var kycStatus = await _db.KycProfiles
                .AsNoTracking()
                .Where(k => k.UserId == userId)
                .Select(k => (KycStatus?)k.Status)
                .FirstOrDefaultAsync(ct);

            if (kycStatus is null)
                return StatusCode(StatusCodes.Status403Forbidden, Problem(
                    title: "KYC required",
                    detail: "You must complete identity verification (KYC) before you can trade."));

            if (kycStatus != KycStatus.Approved)
            {
                var msg = kycStatus switch
                {
                    KycStatus.Submitted => "Your KYC is under review. Trading will unlock after approval.",
                    KycStatus.Rejected => "Your KYC was rejected. Please update your details/documents and resubmit.",
                    KycStatus.Draft => "Your KYC is incomplete. Please finish and submit it to enable trading.",
                    _ => $"Your KYC status is '{kycStatus}'. Trading requires approval."
                };

                return StatusCode(StatusCodes.Status403Forbidden, Problem(
                    title: "Trading disabled", detail: msg));
            }
        }

        var trades = await _db.Trades
            .AsNoTracking()
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.ExecutedAtUtc)
            .Select(t => new TradeResponse
            {
                TradeId = t.Id,
                Symbol = t.Symbol,
                Side = t.Side.ToString(),
                Quantity = t.Quantity,
                PriceAtExecution = t.Price,
                ExecutedAtUtc = t.ExecutedAtUtc
            })
            .ToListAsync(ct);

        return Ok(trades);
    }

    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<ActionResult> AllTrades(CancellationToken ct)
    {
        var trades = await _db.Trades
            .AsNoTracking()
            .OrderByDescending(t => t.ExecutedAtUtc)
            .Take(500)
            .Select(t => new
            {
                t.Id,
                t.UserId,
                t.Symbol,
                Side = t.Side.ToString(),
                t.Quantity,
                PriceAtExecution = t.Price,
                t.ExecutedAtUtc
            })
            .ToListAsync(ct);

        return Ok(trades);
    }

    private async Task<ActionResult<TradeResponse>> ExecuteTrade(
        TradeRequest request,
        TradeSide side,
        CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(Problem(title: "Unauthorized", detail: "Missing user id claim."));

        var isAdmin = User.IsInRole("Admin");

        if (!isAdmin)
        {
            var kycStatus = await _db.KycProfiles
                .AsNoTracking()
                .Where(k => k.UserId == userId)
                .Select(k => (KycStatus?)k.Status)
                .FirstOrDefaultAsync(ct);

            if (kycStatus is null)
                return StatusCode(StatusCodes.Status403Forbidden, Problem(
                    title: "KYC required",
                    detail: "You must complete identity verification (KYC) before you can trade."));

            if (kycStatus != KycStatus.Approved)
            {
                var msg = kycStatus switch
                {
                    KycStatus.Submitted => "Your KYC is under review. Trading will unlock after approval.",
                    KycStatus.Rejected => "Your KYC was rejected. Please update your details and resubmit.",
                    KycStatus.Draft => "Your KYC is incomplete. Please finish and submit it to enable trading.",
                    _ => $"Your KYC status is '{kycStatus}'. Trading requires approval."
                };

                return StatusCode(StatusCodes.Status403Forbidden, Problem(
                    title: "Trading disabled", detail: msg));
            }
        }

        if (request is null || string.IsNullOrWhiteSpace(request.Symbol))
            return BadRequest(Problem(title: "Invalid request", detail: "Symbol is required."));

        var symbol = request.Symbol.Trim().ToUpperInvariant();

        var stock = await _db.Stocks
            .Include(s => s.CurrentPrice)
            .FirstOrDefaultAsync(s => s.Symbol == symbol && s.IsActive, ct);

        if (stock is null)
            return NotFound(Problem(title: "Stock not found", detail: $"Unknown or inactive symbol '{symbol}'."));

        if (_fluctuation.IsTradingBlocked(stock.Id))
            return Conflict(Problem(
                title: "Price fluctuating",
                detail: "Trading is temporarily disabled for this stock (about 2 seconds). Please try again."));

        if (stock.CurrentPrice is null)
            return UnprocessableEntity(Problem(
                title: "Price not set",
                detail: $"No price has been set for '{symbol}' yet."));

        if (request.Quantity <= 0)
            return BadRequest(Problem(title: "Invalid quantity", detail: "Quantity must be >= 1."));

        if (request.Quantity > 50)
            return BadRequest(Problem(title: "Invalid quantity", detail: "You can buy or sell a maximum of 50 stocks at once."));

        var price = stock.CurrentPrice.Price;
        var nowUtc = DateTime.UtcNow;

        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        var holding = await _db.Holdings
            .FirstOrDefaultAsync(h => h.UserId == userId && h.StockId == stock.Id, ct);

        // ── Availability guards ────────────────────────────────────
        if (side == TradeSide.Buy)
        {
            if (stock.AvailableStocks < request.Quantity)
                return UnprocessableEntity(Problem(
                    title: "Insufficient stock available",
                    detail: $"Only {stock.AvailableStocks} stocks are available to buy."));

            stock.AvailableStocks -= request.Quantity;
        }
        else
        {
            if (holding is null || holding.Quantity < request.Quantity)
                return UnprocessableEntity(Problem(
                    title: "Insufficient holdings",
                    detail: "You do not have enough quantity to sell."));

            stock.AvailableStocks += request.Quantity;
        }

        // ── Create holding row on first ever buy ───────────────────
        if (holding is null)
        {
            holding = new Holding
            {
                UserId = userId,
                StockId = stock.Id,
                Quantity = 0,
                AverageBuyPrice = 0
            };
            _db.Holdings.Add(holding);
        }

        // ── Update quantity + weighted average buy price ───────────
        if (side == TradeSide.Buy)
        {
            var totalCost = (holding.AverageBuyPrice * holding.Quantity) + (price * request.Quantity);
            var totalQuantity = holding.Quantity + request.Quantity;

            holding.AverageBuyPrice = totalCost / totalQuantity;
            holding.Quantity = totalQuantity;
        }
        else
        {
            // Selling only reduces quantity — average buy price stays the same
            holding.Quantity -= request.Quantity;
        }

        holding.UpdatedAtUtc = nowUtc;

        if (holding.Quantity == 0)
            _db.Holdings.Remove(holding);

        // ── Record trade ───────────────────────────────────────────
        var trade = new Trade
        {
            UserId = userId,
            StockId = stock.Id,
            Symbol = stock.Symbol,
            Side = side,
            Quantity = request.Quantity,
            Price = price,
            ExecutedAtUtc = nowUtc
        };

        _db.Trades.Add(trade);
        await _db.SaveChangesAsync(ct);

        // ── Detach stock so the fluctuation service gets a clean read
        // Without this, EF returns the stale cached entity inside the
        // service and the price update goes in the wrong direction.
        _db.Entry(stock).State = EntityState.Detached;
        if (stock.CurrentPrice is not null)
            _db.Entry(stock.CurrentPrice).State = EntityState.Detached;

        await _fluctuation.ApplyFluctuationIfNeededAsync(stock.Id, ct);
        await tx.CommitAsync(ct);

        return Ok(new TradeResponse
        {
            TradeId = trade.Id,
            Symbol = trade.Symbol,
            Side = trade.Side.ToString(),
            Quantity = trade.Quantity,
            PriceAtExecution = trade.Price,
            ExecutedAtUtc = trade.ExecutedAtUtc
        });
    }
}