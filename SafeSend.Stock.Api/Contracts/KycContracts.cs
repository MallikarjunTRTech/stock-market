using System.ComponentModel.DataAnnotations;
using SafeSend.Stock.Api.Models;

namespace SafeSend.Stock.Api.Contracts;

// -------- User-facing --------

public sealed class KycProfileUpsertRequest
{
    [MaxLength(200)]
    public string? FullName { get; set; }

    // Use DateOnly for your entity. In JSON this will be "YYYY-MM-DD" in modern .NET.
    public DateOnly? DateOfBirth { get; set; }

    [MaxLength(200)]
    public string? AddressLine1 { get; set; }

    [MaxLength(120)]
    public string? City { get; set; }

    /// <summary>ISO-3166-1 alpha-2 suggested (US, GB, etc.)</summary>
    [MaxLength(2)]
    public string? Country { get; set; }
}

public sealed class KycDocumentResponse
{
    public Guid Id { get; set; }
    public KycDocumentType Type { get; set; }
    public KycDocumentStatus Status { get; set; }
    public string OriginalFileName { get; set; } = default!;
    public string ContentType { get; set; } = default!;
    public long SizeBytes { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime UploadedUtc { get; set; }
    public DateTime? ReviewedUtc { get; set; }
}

public sealed class KycProfileResponse
{
    public Guid Id { get; set; }
    public KycStatus Status { get; set; }

    public string? FullName { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string? AddressLine1 { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }

    public DateTime CreatedUtc { get; set; }
    public DateTime? SubmittedUtc { get; set; }
    public DateTime? ReviewedUtc { get; set; }

    public List<KycDocumentResponse> Documents { get; set; } = new();
}

public sealed class KycSubmitResponse
{
    public KycStatus Status { get; set; }
    public DateTime? SubmittedUtc { get; set; }
}

// For multipart/form-data upload
public sealed class KycDocumentUploadRequest
{
    [Required]
    public KycDocumentType Type { get; set; }

    [Required]
    public IFormFile File { get; set; } = default!;
}

// -------- Admin-facing --------

public sealed class AdminKycListItemResponse
{
    public Guid KycProfileId { get; set; }
    public string UserId { get; set; } = default!;
    public string UserName { get; set; } = default!; 
    public KycStatus Status { get; set; }
    public DateTime CreatedUtc { get; set; }
    public DateTime? SubmittedUtc { get; set; }
}

public sealed class AdminKycProfileResponse
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = default!;
    public string UserName { get; set; } = default!; 
    public KycStatus Status { get; set; }

    public string? FullName { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string? AddressLine1 { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }

    public DateTime CreatedUtc { get; set; }
    public DateTime? SubmittedUtc { get; set; }
    public DateTime? ReviewedUtc { get; set; }

    public List<KycDocumentResponse> Documents { get; set; } = new();
}

public sealed class AdminKycDecisionRequest
{
    /// <summary>Optional note/reason shown to the user (especially on reject).</summary>
    [MaxLength(500)]
    public string? Note { get; set; }

    /// <summary>
    /// Optional per-document decisions. If omitted, only profile status is changed.
    /// </summary>
    public List<AdminKycDocumentDecision>? DocumentDecisions { get; set; }
}

public sealed class AdminKycDocumentDecision
{
    [Required]
    public Guid DocumentId { get; set; }

    [Required]
    public KycDocumentStatus Status { get; set; } // Accepted or Rejected

    [MaxLength(500)]
    public string? RejectionReason { get; set; }
}

