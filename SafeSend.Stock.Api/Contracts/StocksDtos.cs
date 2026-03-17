using System.ComponentModel.DataAnnotations;

namespace SafeSend.Stock.Api.Contracts;

public sealed class CreateStockRequest
{
    [Required]
    public Guid CompanyId { get; set; }

    [Required, MinLength(1), MaxLength(16)]
    [RegularExpression("^[A-Z0-9.]+$")]
    public string Symbol { get; set; } = default!;

    [Required, MinLength(2), MaxLength(120)]
    public string Name { get; set; } = default!;
}

public sealed class UpdateStockPriceRequest
{
    [Range(0.0001, 999999999)]
    public decimal Price { get; set; }
}

/// <summary>
/// PUT body for updating ONLY stocks-left + price (by company name).
/// </summary>
public sealed class UpdateCompanyStockRequest
{
    [Range(0, int.MaxValue)]
    public int SharesOutstanding { get; set; }

    [Range(0.0001, 999999999)]
    public decimal Price { get; set; }
}

public sealed class StockListItemResponse
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string CompanyName { get; set; } = default!;
    public string Symbol { get; set; } = default!;
    public string Name { get; set; } = default!;
    public bool IsActive { get; set; }
    public int AvailableStocks { get; set; } // ✅ Add this
    public int SharesOutstanding { get; set; }   // stocks left
    public decimal? PreviousPrice { get; set; }  // ← add this

    public decimal? Price { get; set; }
    public DateTime? PriceUpdatedAtUtc { get; set; }
}

public sealed class StockPriceResponse
{
    public string Symbol { get; set; } = default!;
    public decimal Price { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}