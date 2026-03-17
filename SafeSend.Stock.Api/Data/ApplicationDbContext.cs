using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SafeSend.Stock.Api.Models;
using StockEntity = SafeSend.Stock.Api.Models.Stock;

namespace SafeSend.Stock.Api.Data;

public sealed class ApplicationDbContext : IdentityDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<WatchlistItem> WatchlistItems => Set<WatchlistItem>();
    public DbSet<Trade> Trades => Set<Trade>();
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<StockEntity> Stocks => Set<StockEntity>();
    public DbSet<StockPrice> StockPrices => Set<StockPrice>();
    public DbSet<Holding> Holdings => Set<Holding>();
    public DbSet<KycProfile> KycProfiles => Set<KycProfile>();
    public DbSet<KycDocument> KycDocuments => Set<KycDocument>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<WatchlistItem>()
            .HasIndex(x => new { x.UserId, x.Symbol })
            .IsUnique();

        builder.Entity<WatchlistItem>()
            .Property(x => x.Symbol)
            .HasMaxLength(16);

        builder.Entity<Trade>()
            .Property(x => x.Symbol)
            .HasMaxLength(16);

        builder.Entity<Trade>()
            .Property(x => x.Price)
            .HasColumnType("decimal(18,4)");

        builder.Entity<Company>()
            .HasIndex(x => x.Name)
            .IsUnique();

        builder.Entity<Company>()
            .Property(x => x.Name)
            .HasMaxLength(120);

        builder.Entity<Company>()
            .HasIndex(c => c.Symbol)
            .IsUnique();

        builder.Entity<StockEntity>()
            .HasIndex(s => s.CompanyId)
            .IsUnique();

        builder.Entity<StockEntity>()
             .HasOne(s => s.CurrentPrice)
             .WithOne(p => p.Stock)
             .HasForeignKey<StockPrice>(p => p.StockId);

        builder.Entity<StockEntity>()
            .HasIndex(s => new { s.CompanyId, s.Symbol })
            .IsUnique();

        builder.Entity<StockEntity>()
            .HasOne(s => s.CurrentPrice)
            .WithOne(p => p.Stock)
            .HasForeignKey<StockPrice>(p => p.StockId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<StockEntity>()
            .HasIndex(x => x.Symbol)
            .IsUnique();

        builder.Entity<StockEntity>()
            .Property(x => x.Symbol)
            .HasMaxLength(16);

        builder.Entity<StockEntity>()
            .Property(x => x.Name)
            .HasMaxLength(120);

        builder.Entity<StockEntity>()
            .HasIndex(s => new { s.CompanyId, s.Symbol })
            .IsUnique();

        builder.Entity<KycProfile>()
            .HasIndex(x => x.UserId)
            .IsUnique();

        builder.Entity<KycProfile>()
            .Property(x => x.FullName)
            .HasMaxLength(200);

        builder.Entity<KycProfile>()
            .Property(x => x.AddressLine1)
            .HasMaxLength(200);

        builder.Entity<KycProfile>()
            .Property(x => x.City)
            .HasMaxLength(120);

        builder.Entity<KycProfile>()
            .Property(x => x.Country)
            .HasMaxLength(2);

        builder.Entity<KycDocument>()
            .HasIndex(x => x.KycProfileId);

        builder.Entity<KycDocument>()
            .Property(x => x.StorageKey)
            .HasMaxLength(500);

        builder.Entity<KycDocument>()
            .Property(x => x.OriginalFileName)
            .HasMaxLength(260);

        builder.Entity<KycDocument>()
            .Property(x => x.ContentType)
            .HasMaxLength(120);

        builder.Entity<KycDocument>()
            .Property(x => x.RejectionReason)
            .HasMaxLength(500);

        builder.Entity<KycProfile>()
            .HasMany(x => x.Documents)
            .WithOne(x => x.KycProfile)
            .HasForeignKey(x => x.KycProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<KycDocument>()
            .HasIndex(x => new { x.KycProfileId, x.Type })
            .IsUnique();

        builder.Entity<StockPrice>()
            .Property(x => x.Price)
            .HasColumnType("decimal(18,4)");

        builder.Entity<StockPrice>()
            .HasIndex(x => x.StockId)
            .IsUnique();

        builder.Entity<Holding>()
            .HasIndex(x => new { x.UserId, x.StockId })
            .IsUnique();
    }
}