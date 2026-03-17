using System.ComponentModel.DataAnnotations;

namespace SafeSend.Stock.Api.Contracts;

public sealed class TradeRequest
{
    [Required, MinLength(1), MaxLength(16)]
    [RegularExpression("^[A-Z0-9.]+$")]
    public string Symbol { get; set; } = default!;

    [Range(1, 50, ErrorMessage = "Quantity must be between 1 and 50.")]
    public int Quantity { get; set; }
}

public sealed class TradeResponse
{
    public Guid TradeId { get; set; }
    public string Symbol { get; set; } = default!;
    public string Side { get; set; } = default!;
    public int Quantity { get; set; }
    public decimal PriceAtExecution { get; set; }
    public DateTime ExecutedAtUtc { get; set; }
}