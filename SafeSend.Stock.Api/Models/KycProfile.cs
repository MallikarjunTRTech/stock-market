namespace SafeSend.Stock.Api.Models;

public sealed class KycProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // IdentityDbContext uses string keys by default (AspNetUsers.Id is string)
    public string UserId { get; set; } = default!;

    public KycStatus Status { get; set; } = KycStatus.NotStarted;
    public string? FullName { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string? AddressLine1 { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }

    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    public DateTime? SubmittedUtc { get; set; }
    public DateTime? ReviewedUtc { get; set; }

    public List<KycDocument> Documents { get; set; } = new();
}