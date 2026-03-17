namespace SafeSend.Stock.Api.Models;

public enum TradeSide
{
    Buy = 1,
    Sell = 2
}

public sealed class Trade
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string UserId { get; set; } = default!;

    public Guid StockId { get; set; }
    public Stock Stock { get; set; } = default!;

    public string Symbol { get; set; } = default!;

    public TradeSide Side { get; set; }
    public int Quantity { get; set; }
    public decimal Price { get; set; }

    public DateTime ExecutedAtUtc { get; set; } = DateTime.UtcNow;
}