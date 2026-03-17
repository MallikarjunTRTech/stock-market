namespace SafeSend.Stock.Api.Models;

public sealed class KycDocument
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid KycProfileId { get; set; }
    public KycProfile KycProfile { get; set; } = default!;

    public KycDocumentType Type { get; set; }
    public KycDocumentStatus Status { get; set; } = KycDocumentStatus.Uploaded;

    // Where the file is stored (disk key, blob name, etc.)
    public string StorageKey { get; set; } = default!;
    public string OriginalFileName { get; set; } = default!;
    public string ContentType { get; set; } = default!;
    public long SizeBytes { get; set; }

    public string? RejectionReason { get; set; }

    public DateTime UploadedUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedUtc { get; set; }
}