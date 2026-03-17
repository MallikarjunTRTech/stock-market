using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SafeSend.Stock.Api.Common;
using SafeSend.Stock.Api.Data;
using SafeSend.Stock.Api.Models;

namespace SafeSend.Stock.Api.Controllers;

[ApiController]
[Authorize]
public sealed class ReportsController : ControllerBase
{
    [HttpGet("/portfolio/summary")]
    public async Task<IActionResult> PortfolioSummary([FromServices] ApplicationDbContext db)
    {
        var userId = User.RequireUserId();

        var rows = await db.Trades
            .Where(t => t.UserId == userId)
            .GroupBy(t => t.Symbol)
            .Select(g => new
            {
                Symbol = g.Key,
                NetQuantity = g.Sum(t => t.Side == TradeSide.Buy ? t.Quantity : -t.Quantity),

                BuyQty = g.Where(t => t.Side == TradeSide.Buy).Sum(t => (int?)t.Quantity) ?? 0,
                BuyCost = g.Where(t => t.Side == TradeSide.Buy).Sum(t => (decimal?)(t.Quantity * t.Price)) ?? 0m,

                SellProceeds = g.Where(t => t.Side == TradeSide.Sell).Sum(t => (decimal?)(t.Quantity * t.Price)) ?? 0m
            })
            .Select(x => new
            {
                x.Symbol,
                x.NetQuantity,
                AvgBuyPrice = x.BuyQty == 0 ? 0m : x.BuyCost / x.BuyQty,
                TotalBuyCost = x.BuyCost,
                TotalSellProceeds = x.SellProceeds
            })
            .Where(x => x.NetQuantity != 0)
            .OrderBy(x => x.Symbol)
            .ToListAsync();

        return Ok(rows);
    }

    [HttpGet("reports/trades")]
    public async Task<IActionResult> TradesReport(
        [FromServices] ApplicationDbContext db,
        [FromQuery] int take = 50)
    {
        var userId = User.RequireUserId();
        if (take < 1) take = 50;
        if (take > 500) take = 500;

        var rows = await db.Trades
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.ExecutedAtUtc)
            .Take(take)
            .Select(t => new
            {
                t.Id,
                t.Symbol,
                Side = t.Side.ToString(),
                t.Quantity,
                t.Price,
                t.ExecutedAtUtc
            })
            .ToListAsync();

        return Ok(rows);
    }
}