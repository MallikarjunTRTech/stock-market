namespace SafeSend.Stock.Api.Models;

public sealed class WatchlistItem
{
    public int Id { get; set; }
    public string UserId { get; set; } = default!;
    public string Symbol { get; set; } = default!;
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}