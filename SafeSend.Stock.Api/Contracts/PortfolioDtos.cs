namespace SafeSend.Stock.Api.Contracts;

public sealed class PortfolioItemResponse
{
    public string Symbol { get; set; } = default!;
    public string CompanyName { get; set; } = default!;
    public int Quantity { get; set; }
    public decimal CurrentPrice { get; set; }
    public decimal MarketValue { get; set; }
    public decimal AverageBuyPrice { get; set; }    
}

public sealed class PortfolioResponse
{
    public List<PortfolioItemResponse> Items { get; set; } = new();
    public decimal TotalMarketValue { get; set; }
}

public class HoldingPriceResponse
{
    public Guid StockId { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public decimal CurrentPrice { get; set; }
    public decimal AverageBuyPrice { get; set; }  
}