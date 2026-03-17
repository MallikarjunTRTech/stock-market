namespace SafeSend.Stock.Api.Contracts;
//using dto will increase security and u decide what data to be exposed

public sealed record CreateCompanyRequest(
    string CompanySymbol,
    string CompanyName,
    int NumberOfStock,
    decimal PricePerStock
);

public sealed class CompanyResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string Symbol { get; set; } = default!;

    // Even if you keep exactly one stock per company, returning a list is fine (0 or 1 item).
    public List<StockListItemResponse> Stocks { get; set; } = new();
}