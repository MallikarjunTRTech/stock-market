namespace SafeSend.Stock.Api.Models;

public sealed class Stock
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = default!;

    public string Symbol { get; set; } = default!;
    public string Name { get; set; } = default!;
    public bool IsActive { get; set; }
    public int AvailableStocks { get; set; }

    public int SharesOutstanding { get; set; }

    public StockPrice? CurrentPrice { get; set; }
}