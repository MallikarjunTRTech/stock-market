namespace SafeSend.Stock.Api.Models;

public sealed class StockPrice
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid StockId { get; set; }
    public Stock Stock { get; set; } = default!;
    public decimal? PreviousPrice { get; set; }  
    public decimal Price { get; set; }              // > 0
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}