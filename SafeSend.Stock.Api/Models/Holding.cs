namespace SafeSend.Stock.Api.Models;

public sealed class Holding
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string UserId { get; set; } = default!;
    public Guid StockId { get; set; }
    public Stock Stock { get; set; } = default!;

    public int Quantity { get; set; }
    public decimal AverageBuyPrice { get; set; }   
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}