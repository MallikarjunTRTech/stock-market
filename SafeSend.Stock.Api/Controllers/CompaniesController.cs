using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SafeSend.Stock.Api.Contracts;
using SafeSend.Stock.Api.Data;
using SafeSend.Stock.Api.Models;

namespace SafeSend.Stock.Api.Controllers;

[ApiController]
[Route("api/companies")]
public sealed class CompaniesController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public CompaniesController(ApplicationDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<CompanyResponse>>> GetAll(CancellationToken ct)
    {
        var items = await _db.Companies
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CompanyResponse { Id = c.Id, Name = c.Name, Symbol = c.Symbol })
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpGet("{companyId:guid}")]
    public async Task<ActionResult<CompanyResponse>> GetById(Guid companyId, CancellationToken ct)
    {
        var item = await _db.Companies
            .AsNoTracking()
            .Where(c => c.Id == companyId)
            .Select(c => new CompanyResponse
            {
                Id = c.Id,
                Name = c.Name,
                Symbol = c.Symbol
            })
            .SingleOrDefaultAsync(ct);

        return item is null ? NotFound() : Ok(item);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<CompanyResponse>> Create(
        [FromBody] CreateCompanyRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.CompanySymbol))
            return BadRequest(Problem(title: "Invalid company symbol", detail: "CompanySymbol is required."));

        if (string.IsNullOrWhiteSpace(request.CompanyName))
            return BadRequest(Problem(title: "Invalid company name", detail: "CompanyName is required."));

        if (request.NumberOfStock <= 0)
            return BadRequest(Problem(title: "Invalid number of stock", detail: "NumberOfStock must be > 0."));

        if (request.PricePerStock <= 0)
            return BadRequest(Problem(title: "Invalid price", detail: "PricePerStock must be > 0."));

        var symbol = request.CompanySymbol.Trim().ToUpperInvariant();
        var name = request.CompanyName.Trim();

        var companyNameExists = await _db.Companies.AnyAsync(c => c.Name == name, ct);
        if (companyNameExists)
            return Conflict(Problem(title: "Company already exists", detail: $"Company '{name}' already exists."));

        var companySymbolExists = await _db.Companies.AnyAsync(c => c.Symbol == symbol, ct);
        if (companySymbolExists)
            return Conflict(Problem(title: "Company symbol already exists", detail: $"Company symbol '{symbol}' already exists."));

        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        var company = new Company
        {
            Symbol = symbol,
            Name = name
        };

        _db.Companies.Add(company);

        var stock = new SafeSend.Stock.Api.Models.Stock
        {
            CompanyId = company.Id,
            Symbol = symbol,
            Name = name,
            SharesOutstanding = request.NumberOfStock,
            AvailableStocks = request.NumberOfStock,   // all shares available on creation
            IsActive = true,
            CurrentPrice = new StockPrice
            {
                Price = request.PricePerStock,
                PreviousPrice = null,
                UpdatedAtUtc = DateTime.UtcNow
            }
        };

        _db.Stocks.Add(stock);

        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var response = new CompanyResponse { Id = company.Id, Name = company.Name, Symbol = company.Symbol };
        return CreatedAtAction(nameof(GetById), new { companyId = company.Id }, response);
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{companyId:guid}/stocks/{symbol}")]
    public async Task<IActionResult> DeleteStockByCompanyId(
        Guid companyId,
        string symbol,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(symbol))
            return BadRequest(Problem(title: "Invalid symbol", detail: "symbol is required."));

        var sym = symbol.Trim().ToUpperInvariant();

        var stock = await _db.Stocks
            .Where(s => s.CompanyId == companyId && s.Symbol == sym)
            .SingleOrDefaultAsync(ct);

        if (stock is null)
            return NotFound(Problem(
                title: "Stock not found",
                detail: $"Stock '{sym}' not found for company {companyId}."));

        _db.Stocks.Remove(stock);
        await _db.SaveChangesAsync(ct);

        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("by-name/{companyName}/stocks")]
    public async Task<ActionResult<StockListItemResponse>> UpdateCompanyStockByCompanyName(
        string companyName,
        [FromBody] UpdateCompanyStockRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(companyName))
            return BadRequest(Problem(title: "Invalid company name", detail: "companyName is required."));

        var name = companyName.Trim();

        var stock = await _db.Stocks
            .Include(s => s.Company)
            .Include(s => s.CurrentPrice)
            .SingleOrDefaultAsync(s => s.Company.Name == name, ct);

        if (stock is null)
            return NotFound(Problem(
                title: "Stock not found",
                detail: $"No stock found for company '{name}'."));

        stock.SharesOutstanding = request.SharesOutstanding;

        if (stock.CurrentPrice is null)
        {
            stock.CurrentPrice = new StockPrice
            {
                StockId = stock.Id,
                Price = request.Price,
                PreviousPrice = null,
                UpdatedAtUtc = DateTime.UtcNow
            };
        }
        else
        {
            stock.CurrentPrice.PreviousPrice = stock.CurrentPrice.Price;
            stock.CurrentPrice.Price = request.Price;
            stock.CurrentPrice.UpdatedAtUtc = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);

        return Ok(new StockListItemResponse
        {
            Id = stock.Id,
            CompanyId = stock.CompanyId,
            CompanyName = stock.Company.Name,
            Symbol = stock.Symbol,
            Name = stock.Name,
            IsActive = stock.IsActive,
            SharesOutstanding = stock.SharesOutstanding,
            AvailableStocks = stock.AvailableStocks,
            Price = stock.CurrentPrice?.Price,
            PreviousPrice = stock.CurrentPrice?.PreviousPrice,
            PriceUpdatedAtUtc = stock.CurrentPrice?.UpdatedAtUtc
        });
    }

    [HttpGet("{companyId:guid}/stocks")]
    public async Task<ActionResult<CompanyResponse>> GetCompanyStocks(
        Guid companyId,
        CancellationToken ct)
    {
        var result = await _db.Companies
            .AsNoTracking()
            .Where(c => c.Id == companyId)
            .Select(c => new CompanyResponse
            {
                Id = c.Id,
                Name = c.Name,
                Symbol = c.Symbol,
                Stocks = c.Stocks
                    .OrderBy(s => s.Symbol)
                    .Select(s => new StockListItemResponse
                    {
                        Id = s.Id,
                        CompanyId = s.CompanyId,
                        CompanyName = c.Name,
                        Symbol = s.Symbol,
                        Name = s.Name,
                        IsActive = s.IsActive,
                        SharesOutstanding = s.SharesOutstanding,
                        AvailableStocks = s.AvailableStocks,
                        Price = s.CurrentPrice != null ? (decimal?)s.CurrentPrice.Price : null,
                        PreviousPrice = s.CurrentPrice != null ? (decimal?)s.CurrentPrice.PreviousPrice : null,
                        PriceUpdatedAtUtc = s.CurrentPrice != null ? (DateTime?)s.CurrentPrice.UpdatedAtUtc : null
                    })
                    .ToList()
            })
            .SingleOrDefaultAsync(ct);

        if (result is null)
            return NotFound(Problem(
                title: "Company not found",
                detail: $"Company {companyId} not found."));

        return Ok(result);
    }

    public record CreateStockRequest(string Symbol, string Name);
    public record StockDto(Guid Id, string Symbol, string Name, bool IsActive, Guid CompanyId);
}