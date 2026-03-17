using Microsoft.EntityFrameworkCore;
using SafeSend.Stock.Api.Data;
using SafeSend.Stock.Api.Models;
using System;
using System.Collections.Concurrent;

namespace SafeSend.Stock.Api.Services;

public sealed class MarketFluctuationService
{
    private readonly ApplicationDbContext _db;

    private const int StepQty = 5;
    private const decimal StepPercent = 0.02m;
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan Cooldown = TimeSpan.FromSeconds(2);

    private static readonly ConcurrentDictionary<Guid, DateTime> _lastFluctuationUtc = new();

    public MarketFluctuationService(ApplicationDbContext db) => _db = db;

    /// <summary>
    /// Returns true if trading should be blocked for this stock because a fluctuation
    /// happened very recently (cooldown window).
    /// </summary>
    public bool IsTradingBlocked(Guid stockId)
    {
        if (!_lastFluctuationUtc.TryGetValue(stockId, out var lastUtc))
            return false;

        return (DateTime.UtcNow - lastUtc) < Cooldown;
    }

    /// <summary>
    /// Applies price fluctuation for a stock based on net Buy/Sell quantity in the last minute.
    ///
    /// netQty = boughtQty - soldQty
    /// steps  = floor(|netQty| / 5)
    /// - netQty > 0 => price increases (more buying than selling)
    /// - netQty < 0 => price decreases (more selling than buying)
    /// - steps == 0 => no change
    ///
    /// Uses AsNoTracking + explicit entry attachment to avoid EF cache
    /// conflicts when called after the controller's SaveChangesAsync.
    /// </summary>
    public async Task ApplyFluctuationIfNeededAsync(Guid stockId, CancellationToken ct = default)
    {
        var nowUtc = DateTime.UtcNow;
        var windowStartUtc = nowUtc - Window;

        // AsNoTracking is critical here — the controller already saved and detached
        // its stock entity. Without this, EF may return a stale cached instance
        // which causes the price to move in the wrong direction.
        var stock = await _db.Stocks
            .AsNoTracking()
            .Include(s => s.CurrentPrice)
            .FirstOrDefaultAsync(s => s.Id == stockId, ct);

        if (stock is null)
            throw new InvalidOperationException($"Stock {stockId} not found.");

        if (stock.CurrentPrice is null)
            throw new InvalidOperationException($"Stock {stockId} has no CurrentPrice row.");

        // Aggregate buy/sell quantities within the rolling window
        var agg = await _db.Trades
            .Where(t => t.StockId == stockId &&
                        t.ExecutedAtUtc >= windowStartUtc &&
                        t.ExecutedAtUtc <= nowUtc)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                BoughtQty = g.Where(t => t.Side == TradeSide.Buy)
                             .Sum(t => (int?)t.Quantity) ?? 0,
                SoldQty = g.Where(t => t.Side == TradeSide.Sell)
                             .Sum(t => (int?)t.Quantity) ?? 0
            })
            .FirstOrDefaultAsync(ct);

        var boughtQty = agg?.BoughtQty ?? 0;
        var soldQty = agg?.SoldQty ?? 0;

        var netQty = boughtQty - soldQty;
        var steps = Math.Abs(netQty) / StepQty; // integer division — full groups of 5 only

        if (steps == 0)
            return;

        // net buy  → price goes up
        // net sell → price goes down
        decimal multiplier = netQty > 0
            ? 1.0m + (steps * StepPercent)
            : 1.0m - (steps * StepPercent);

        if (multiplier <= 0m) multiplier = 0.01m;

        var oldPrice = stock.CurrentPrice.Price;
        var newPrice = decimal.Round(oldPrice * multiplier, 2, MidpointRounding.AwayFromZero);

        if (newPrice < 0.01m) newPrice = 0.01m;

        // If rounding produces no effective change, skip cooldown too
        if (newPrice == oldPrice)
            return;

        stock.CurrentPrice.PreviousPrice = oldPrice;
        stock.CurrentPrice.Price = newPrice;
        stock.CurrentPrice.UpdatedAtUtc = nowUtc;

        // The stock was loaded with AsNoTracking so EF is not tracking CurrentPrice.
        // We attach it and mark only the three changed columns as modified
        // to avoid unintentionally overwriting other columns.
        var entry = _db.Entry(stock.CurrentPrice);
        entry.State = EntityState.Unchanged;
        entry.Property(p => p.PreviousPrice).IsModified = true;
        entry.Property(p => p.Price).IsModified = true;
        entry.Property(p => p.UpdatedAtUtc).IsModified = true;

        await _db.SaveChangesAsync(ct);

        _lastFluctuationUtc[stockId] = nowUtc;
        CleanupOldEntries(nowUtc);
    }

    private static int _cleanupCounter = 0;

    private static void CleanupOldEntries(DateTime nowUtc)
    {
        if (Interlocked.Increment(ref _cleanupCounter) % 500 != 0)
            return;

        foreach (var kvp in _lastFluctuationUtc)
        {
            if ((nowUtc - kvp.Value) > TimeSpan.FromMinutes(10))
                _lastFluctuationUtc.TryRemove(kvp.Key, out _);
        }
    }
}