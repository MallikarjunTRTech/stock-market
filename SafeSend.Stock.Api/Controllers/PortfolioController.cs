using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SafeSend.Stock.Api.Contracts;
using SafeSend.Stock.Api.Data;

namespace SafeSend.Stock.Api.Controllers;

[ApiController]
[Route("api/portfolio")]
[Authorize]
public sealed class PortfolioController : ControllerBase
{
    private readonly ApplicationDbContext _db; //connection to the database

    public PortfolioController(ApplicationDbContext db) => _db = db;

    [HttpGet("me")]
    public async Task<ActionResult<PortfolioResponse>> Me(CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(Problem(title: "Unauthorized", detail: "Missing user id claim."));

        //This is the LINQ query
        var holdings = await _db.Holdings
            .AsNoTracking()
            .Where(h => h.UserId == userId) // methods of LINQ
            .Include(h => h.Stock)
                .ThenInclude(s => s.Company)
            .Include(h => h.Stock)
                .ThenInclude(s => s.CurrentPrice)
            .ToListAsync(ct); // Translates it to the SQL Query

        var resp = new PortfolioResponse();

        foreach (var h in holdings)
        {
            var price = h.Stock.CurrentPrice?.Price ?? 0m;
            var mv = price * h.Quantity;

            resp.Items.Add(new PortfolioItemResponse
            {
                Symbol = h.Stock.Symbol,
                CompanyName = h.Stock.Company.Name,
                Quantity = h.Quantity,
                CurrentPrice = price,
                MarketValue = mv,
                AverageBuyPrice = h.AverageBuyPrice
            });

            resp.TotalMarketValue += mv;
        }

        resp.Items = resp.Items.OrderBy(x => x.Symbol).ToList();
        return Ok(resp);
    }

    [HttpGet("holdings/prices")]
    public async Task<ActionResult<List<HoldingPriceResponse>>> GetHoldingPrices(CancellationToken ct)//cancel button(if user closes connection in midway)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized();

        // Query from Holdings directly — only returns stocks the user currently holds,
        // not historical trades for stocks they may have fully sold.
        var prices = await _db.Holdings
            .AsNoTracking()
            .Where(h => h.UserId == userId)
            .Include(h => h.Stock)
                .ThenInclude(s => s.CurrentPrice)
            .Select(h => new HoldingPriceResponse
            {
                StockId = h.StockId,
                Symbol = h.Stock.Symbol,
                CurrentPrice = h.Stock.CurrentPrice != null ? h.Stock.CurrentPrice.Price : 0m,
                AverageBuyPrice = h.AverageBuyPrice
            })
            .ToListAsync(ct);

        return Ok(prices);
    }

    [HttpGet("holdings/history")]
    public async Task<IActionResult> GetHoldingHistory(CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized();

        var since = DateTime.UtcNow.AddHours(-24);

        var trades = await _db.Trades
            .AsNoTracking()
            .Where(t => t.UserId == userId && t.ExecutedAtUtc >= since)
            .Include(t => t.Stock)
            .OrderBy(t => t.ExecutedAtUtc)
            .ToListAsync(ct);

        var result = trades
            .GroupBy(t => t.Stock.Symbol)
            .Select(symbolGroup => new
            {
                Symbol = symbolGroup.Key,
                Candles = symbolGroup
                    .GroupBy(t => new DateTime(
                        t.ExecutedAtUtc.Year,
                        t.ExecutedAtUtc.Month,
                        t.ExecutedAtUtc.Day,
                        t.ExecutedAtUtc.Hour, 0, 0, DateTimeKind.Utc))
                    .OrderBy(g => g.Key)
                    .Select(hourGroup => new
                    {
                        Time = ((DateTimeOffset)hourGroup.Key).ToUnixTimeSeconds(),
                        Open = hourGroup.First().Price,
                        High = hourGroup.Max(t => t.Price),
                        Low = hourGroup.Min(t => t.Price),
                        Close = hourGroup.Last().Price,
                    })
                    .ToList()
            })
            .ToList();

        return Ok(result);
    }
}