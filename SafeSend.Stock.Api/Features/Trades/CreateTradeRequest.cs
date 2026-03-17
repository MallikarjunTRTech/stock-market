namespace SafeSend.Stock.Api.Features.Trades;

public sealed class CreateTradeRequest
{
    public string Symbol { get; set; } = "";
    public int Quantity { get; set; }
    public decimal Price { get; set; }
    public int Side { get; set; }
    public DateOnly TradeDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public string? Notes { get; set; }
}