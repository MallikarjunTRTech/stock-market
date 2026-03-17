using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SafeSend.Stock.Api.Common;
using SafeSend.Stock.Api.Data;
using SafeSend.Stock.Api.Models;

namespace SafeSend.Stock.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/watchlist")]  
public sealed class WatchlistController : ControllerBase
{
    [HttpPost("{symbol}")]
    public async Task<IActionResult> Add(
        [FromServices] ApplicationDbContext db,
        [FromRoute] string symbol)
    {
        var userId = User.RequireUserId();
        symbol = (symbol ?? "").Trim().ToUpperInvariant();

        if (string.IsNullOrWhiteSpace(symbol) || symbol.Length > 16)
            return BadRequest("Invalid symbol.");

        var exists = await db.WatchlistItems.AnyAsync(w => w.UserId == userId && w.Symbol == symbol);
        if (exists) return Conflict("Already in watchlist.");

        db.WatchlistItems.Add(new WatchlistItem
        {
            UserId = userId,
            Symbol = symbol,
            CreatedUtc = DateTime.UtcNow
        });

        await db.SaveChangesAsync();
        return Created($"/watchlist/{symbol}", new { symbol });
    }

    [HttpGet]
    public async Task<IActionResult> Get(
    [FromServices] ApplicationDbContext db)
    {
        var userId = User.RequireUserId();

        var items = await db.WatchlistItems
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.CreatedUtc)
            .Select(w => new
            {
                w.Symbol,
                w.CreatedUtc,
                CompanyName = db.Companies
                    .Where(c => c.Symbol == w.Symbol)
                    .Select(c => c.Name)
                    .FirstOrDefault()
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpDelete("{symbol}")]
    public async Task<IActionResult> Delete(
        [FromServices] ApplicationDbContext db,
        [FromRoute] string symbol)
    {
        var userId = User.RequireUserId();
        symbol = (symbol ?? "").Trim().ToUpperInvariant();

        var item = await db.WatchlistItems
            .FirstOrDefaultAsync(w => w.UserId == userId && w.Symbol == symbol);

        if (item is null) return NotFound();

        db.WatchlistItems.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}