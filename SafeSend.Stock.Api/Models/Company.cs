using SafeSend.Stock.Api.Models;

public sealed class Company
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Symbol { get; set; } = default!;   // e.g. "AAPL" (company ticker)
    public string Name { get; set; } = default!;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public int SharesOutstanding { get; set; }

    public ICollection<Stock> Stocks { get; set; } = new List<Stock>();
}