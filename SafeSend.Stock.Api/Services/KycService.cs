using Microsoft.EntityFrameworkCore;
using SafeSend.Stock.Api.Contracts;
using SafeSend.Stock.Api.Data;
using SafeSend.Stock.Api.Models;

namespace SafeSend.Stock.Api.Services;

public sealed class KycService
{
    private readonly ApplicationDbContext _db;
    private readonly IKycStorage _storage;

    public KycService(ApplicationDbContext db, IKycStorage storage)
    {
        _db = db;
        _storage = storage;
    }

    public async Task<KycProfileResponse> GetMyAsync(string userId, CancellationToken ct)
    {
        var profile = await _db.KycProfiles
            .AsNoTracking()
            .Include(p => p.Documents)
            .FirstOrDefaultAsync(p => p.UserId == userId, ct);

        if (profile is null)
        {
            return new KycProfileResponse
            {
                Id = Guid.Empty,
                Status = KycStatus.NotStarted,
                CreatedUtc = DateTime.UtcNow,
                Documents = new List<KycDocumentResponse>()
            };
        }

        return Map(profile);
    }

    public async Task<KycProfileResponse> UpsertMyProfileAsync(string userId, KycProfileUpsertRequest req, CancellationToken ct)
    {
        var profile = await _db.KycProfiles
            .Include(p => p.Documents)
            .FirstOrDefaultAsync(p => p.UserId == userId, ct);

        if (profile is null)
        {
            profile = new KycProfile
            {
                UserId = userId,
                Status = KycStatus.Draft,
                CreatedUtc = DateTime.UtcNow
            };
            _db.KycProfiles.Add(profile);
        }
        else
        {
            if (profile.Status is KycStatus.Approved)
                throw new InvalidOperationException("KYC is already approved and cannot be edited.");
        }

        profile.FullName = req.FullName?.Trim();
        profile.DateOfBirth = req.DateOfBirth;
        profile.AddressLine1 = req.AddressLine1?.Trim();
        profile.City = req.City?.Trim();
        profile.Country = req.Country?.Trim()?.ToUpperInvariant();

        if (profile.Status == KycStatus.NotStarted)
            profile.Status = KycStatus.Draft;

        await _db.SaveChangesAsync(ct);

        return Map(profile);
    }

    public async Task<KycDocumentResponse> UploadMyDocumentAsync(
        string userId,
        string userName,
        KycDocumentType type,
        IFormFile file,
        CancellationToken ct)
    {
        if (file is null || file.Length <= 0)
            throw new InvalidOperationException("Empty file.");

        var profile = await _db.KycProfiles
            .Include(p => p.Documents)
            .FirstOrDefaultAsync(p => p.UserId == userId, ct);

        if (profile is null)
        {
            profile = new KycProfile
            {
                UserId = userId,
                Status = KycStatus.Draft,
                CreatedUtc = DateTime.UtcNow
            };
            _db.KycProfiles.Add(profile);
            await _db.SaveChangesAsync(ct);
        }

        if (profile.Status is KycStatus.Approved)
            throw new InvalidOperationException("KYC is approved; documents cannot be changed.");

        if (profile.Status is KycStatus.Rejected)
        {
            profile.Status = KycStatus.Draft;
            profile.ReviewedUtc = null;
        }

        await using var stream = file.OpenReadStream();
        var stored = await _storage.SaveAsync(userName, stream, file.FileName, file.ContentType, ct);

        var existing = await _db.KycDocuments
            .FirstOrDefaultAsync(d => d.KycProfileId == profile.Id && d.Type == type, ct);

        if (existing is not null)
        {
            await _storage.DeleteAsync(existing.StorageKey, ct);

            existing.StorageKey = stored.StorageKey;
            existing.OriginalFileName = stored.OriginalFileName;
            existing.ContentType = stored.ContentType;
            existing.SizeBytes = stored.SizeBytes;
            existing.Status = KycDocumentStatus.Uploaded;
            existing.RejectionReason = null;
            existing.UploadedUtc = DateTime.UtcNow;
            existing.ReviewedUtc = null;

            await _db.SaveChangesAsync(ct);
            return Map(existing);
        }

        var doc = new KycDocument
        {
            KycProfileId = profile.Id,
            Type = type,
            Status = KycDocumentStatus.Uploaded,
            StorageKey = stored.StorageKey,
            OriginalFileName = stored.OriginalFileName,
            ContentType = stored.ContentType,
            SizeBytes = stored.SizeBytes,
            UploadedUtc = DateTime.UtcNow
        };

        _db.KycDocuments.Add(doc);

        if (profile.Status == KycStatus.NotStarted)
            profile.Status = KycStatus.Draft;

        await _db.SaveChangesAsync(ct);

        return Map(doc);
    }

    // ── NEW ───────────────────────────────────────────────────────────────────
    public async Task<KycDocumentResponse> ReuploadMyDocumentAsync(
        string userId,
        string userName,
        Guid documentId,
        IFormFile file,
        CancellationToken ct)
    {
        if (file is null || file.Length <= 0)
            throw new InvalidOperationException("Empty file.");

        // Load profile + documents with ownership check
        var profile = await _db.KycProfiles
            .Include(p => p.Documents)
            .FirstOrDefaultAsync(p => p.UserId == userId, ct);

        if (profile is null)
            throw new KeyNotFoundException("KYC profile not found.");

        // Ownership — the document must belong to this user's profile
        var doc = profile.Documents.FirstOrDefault(d => d.Id == documentId);
        if (doc is null)
            throw new KeyNotFoundException("Document not found or does not belong to you.");

        // Only rejected documents can be re-uploaded
        if (doc.Status != KycDocumentStatus.Rejected)
            throw new InvalidOperationException(
                $"Only rejected documents can be re-uploaded. Current status: {doc.Status}.");

        if (profile.Status is KycStatus.Approved)
            throw new InvalidOperationException("KYC is approved; documents cannot be changed.");

        // Delete old file from storage, save new one
        await _storage.DeleteAsync(doc.StorageKey, ct);

        await using var stream = file.OpenReadStream();
        var stored = await _storage.SaveAsync(userName, stream, file.FileName, file.ContentType, ct);

        // Update document — reset back to Uploaded, clear rejection
        doc.StorageKey = stored.StorageKey;
        doc.OriginalFileName = stored.OriginalFileName;
        doc.ContentType = stored.ContentType;
        doc.SizeBytes = stored.SizeBytes;
        doc.Status = KycDocumentStatus.Uploaded;
        doc.RejectionReason = null;
        doc.UploadedUtc = DateTime.UtcNow;
        doc.ReviewedUtc = null;

        // If the whole profile was Rejected, bring it back to Draft
        // so the user can fix remaining docs and re-submit
        if (profile.Status is KycStatus.Rejected)
        {
            profile.Status = KycStatus.Draft;
            profile.ReviewedUtc = null;
        }

        await _db.SaveChangesAsync(ct);

        return Map(doc);
    }
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<List<KycDocumentResponse>> GetMyDocumentsAsync(string userId, CancellationToken ct)
    {
        var profile = await _db.KycProfiles
            .AsNoTracking()
            .Include(p => p.Documents)
            .FirstOrDefaultAsync(p => p.UserId == userId, ct);

        if (profile is null)
            return new List<KycDocumentResponse>();

        return profile.Documents
            .OrderByDescending(d => d.UploadedUtc)
            .Select(Map)
            .ToList();
    }

    public async Task<KycDocumentResponse?> GetMyDocumentAsync(string userId, Guid documentId, CancellationToken ct)
    {
        var profile = await _db.KycProfiles
            .AsNoTracking()
            .Include(p => p.Documents)
            .FirstOrDefaultAsync(p => p.UserId == userId, ct);

        if (profile is null)
            return null;

        var doc = profile.Documents.FirstOrDefault(d => d.Id == documentId);
        if (doc is null)
            return null;

        return Map(doc);
    }

    public async Task<KycSubmitResponse> SubmitMyAsync(string userId, CancellationToken ct)
    {
        var profile = await _db.KycProfiles
            .Include(p => p.Documents)
            .FirstOrDefaultAsync(p => p.UserId == userId, ct);

        if (profile is null)
            throw new InvalidOperationException("Create your KYC profile first.");

        if (profile.Status is KycStatus.Approved)
            return new KycSubmitResponse { Status = profile.Status, SubmittedUtc = profile.SubmittedUtc };

        if (string.IsNullOrWhiteSpace(profile.FullName) ||
            profile.DateOfBirth is null ||
            string.IsNullOrWhiteSpace(profile.AddressLine1) ||
            string.IsNullOrWhiteSpace(profile.City) ||
            string.IsNullOrWhiteSpace(profile.Country))
        {
            throw new InvalidOperationException("KYC profile is incomplete.");
        }

        var requiredTypes = new[]
        {
            KycDocumentType.NationalId,
            KycDocumentType.Pancard,
            KycDocumentType.Selfie
        };

        var present = profile.Documents
            .Where(d => d.Status == KycDocumentStatus.Uploaded || d.Status == KycDocumentStatus.Accepted)
            .Select(d => d.Type)
            .ToHashSet();

        var missing = requiredTypes.Where(t => !present.Contains(t)).ToList();

        if (missing.Count > 0)
        {
            var missingText = string.Join(", ", missing);
            throw new InvalidOperationException($"Missing required documents: {missingText}.");
        }

        profile.Status = KycStatus.Submitted;
        profile.SubmittedUtc = DateTime.UtcNow;
        profile.ReviewedUtc = null;

        await _db.SaveChangesAsync(ct);

        return new KycSubmitResponse { Status = profile.Status, SubmittedUtc = profile.SubmittedUtc };
    }

    // ---------------- Admin ----------------

    public async Task<List<AdminKycListItemResponse>> AdminListAsync(KycStatus? status, int take, CancellationToken ct)
    {
        take = Math.Clamp(take, 1, 500);

        var q = _db.KycProfiles.AsNoTracking();

        if (status is not null)
            q = q.Where(p => p.Status == status);

        return await q
            .OrderByDescending(p => p.SubmittedUtc ?? p.CreatedUtc)
            .Take(take)
            .Join(
                _db.Users,
                p => p.UserId,
                u => u.Id,
                (p, u) => new AdminKycListItemResponse
                {
                    KycProfileId = p.Id,
                    UserId = p.UserId,
                    UserName = p.FullName ?? p.UserId,
                    Status = p.Status,
                    CreatedUtc = p.CreatedUtc,
                    SubmittedUtc = p.SubmittedUtc
                })
            .ToListAsync(ct);
    }

    public async Task<AdminKycProfileResponse?> AdminGetAsync(Guid kycProfileId, CancellationToken ct)
    {
        var p = await _db.KycProfiles
            .AsNoTracking()
            .Include(x => x.Documents)
            .FirstOrDefaultAsync(x => x.Id == kycProfileId, ct);

        if (p is null) return null;

        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == p.UserId, ct);

        return new AdminKycProfileResponse
        {
            Id = p.Id,
            UserId = p.UserId,
            UserName = p.FullName ?? p.UserId,
            Status = p.Status,
            FullName = p.FullName,
            DateOfBirth = p.DateOfBirth,
            AddressLine1 = p.AddressLine1,
            City = p.City,
            Country = p.Country,
            CreatedUtc = p.CreatedUtc,
            SubmittedUtc = p.SubmittedUtc,
            ReviewedUtc = p.ReviewedUtc,
            Documents = p.Documents
                .OrderByDescending(d => d.UploadedUtc)
                .Select(Map)
                .ToList()
        };
    }

    public async Task AdminApproveAsync(Guid kycProfileId, AdminKycDecisionRequest req, CancellationToken ct)
    {
        var profile = await _db.KycProfiles
            .Include(p => p.Documents)
            .FirstOrDefaultAsync(p => p.Id == kycProfileId, ct);

        if (profile is null)
            throw new InvalidOperationException("KYC profile not found.");

        if (profile.Status != KycStatus.Submitted && profile.Status != KycStatus.Rejected && profile.Status != KycStatus.Draft)
            throw new InvalidOperationException($"Cannot approve from status '{profile.Status}'.");

        if (req.DocumentDecisions is { Count: > 0 })
            ApplyDocumentDecisions(profile, req.DocumentDecisions);

        if (profile.Documents.Count == 0 || profile.Documents.Any(d => d.Status != KycDocumentStatus.Accepted))
            throw new InvalidOperationException("All documents must be accepted before approving the profile.");

        profile.Status = KycStatus.Approved;
        profile.ReviewedUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
    }

    public async Task AdminRejectAsync(Guid kycProfileId, AdminKycDecisionRequest req, CancellationToken ct)
    {
        var profile = await _db.KycProfiles
            .Include(p => p.Documents)
            .FirstOrDefaultAsync(p => p.Id == kycProfileId, ct);

        if (profile is null)
            throw new InvalidOperationException("KYC profile not found.");

        if (profile.Status != KycStatus.Submitted && profile.Status != KycStatus.Draft)
            throw new InvalidOperationException($"Cannot reject from status '{profile.Status}'.");

        if (req.DocumentDecisions is { Count: > 0 })
            ApplyDocumentDecisions(profile, req.DocumentDecisions);

        profile.Status = KycStatus.Rejected;
        profile.ReviewedUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
    }

    public async Task<(Stream Stream, string ContentType, string FileName)> AdminDownloadDocumentAsync(
        Guid documentId,
        CancellationToken ct)
    {
        var doc = await _db.KycDocuments
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == documentId, ct);

        if (doc is null)
            throw new InvalidOperationException("Document not found.");

        var stream = await _storage.OpenReadAsync(doc.StorageKey, ct);
        return (stream, doc.ContentType, doc.OriginalFileName);
    }

    public async Task AdminDeleteDocumentAsync(Guid documentId, CancellationToken ct)
    {
        var doc = await _db.KycDocuments
            .Include(d => d.KycProfile)
            .FirstOrDefaultAsync(d => d.Id == documentId, ct);

        if (doc is null)
            throw new InvalidOperationException("Document not found.");

        if (doc.KycProfile.Status is KycStatus.Approved)
            throw new InvalidOperationException("Cannot delete documents from an approved KYC profile.");

        _db.KycDocuments.Remove(doc);
        await _db.SaveChangesAsync(ct);

        try { await _storage.DeleteAsync(doc.StorageKey, ct); }
        catch { }
    }

    public async Task DeleteMyDocumentAsync(string userId, Guid documentId, CancellationToken ct)
    {
        var profile = await _db.KycProfiles
            .Include(p => p.Documents)
            .FirstOrDefaultAsync(p => p.UserId == userId, ct);

        if (profile is null)
            throw new InvalidOperationException("KYC profile not found.");

        if (profile.Status is KycStatus.Approved)
            throw new InvalidOperationException("KYC is approved; documents cannot be deleted.");

        var doc = profile.Documents.FirstOrDefault(d => d.Id == documentId);
        if (doc is null)
            throw new InvalidOperationException("Document not found.");

        if (profile.Status is KycStatus.Submitted)
        {
            profile.Status = KycStatus.Draft;
            profile.SubmittedUtc = null;
            profile.ReviewedUtc = null;
        }

        _db.KycDocuments.Remove(doc);
        await _db.SaveChangesAsync(ct);

        try { await _storage.DeleteAsync(doc.StorageKey, ct); }
        catch { }
    }

    // ---------------- Mapping / Helpers ----------------

    private static KycProfileResponse Map(KycProfile p)
        => new()
        {
            Id = p.Id,
            Status = p.Status,
            FullName = p.FullName,
            DateOfBirth = p.DateOfBirth,
            AddressLine1 = p.AddressLine1,
            City = p.City,
            Country = p.Country,
            CreatedUtc = p.CreatedUtc,
            SubmittedUtc = p.SubmittedUtc,
            ReviewedUtc = p.ReviewedUtc,
            Documents = p.Documents
                .OrderByDescending(d => d.UploadedUtc)
                .Select(Map)
                .ToList()
        };

    private static KycDocumentResponse Map(KycDocument d)
        => new()
        {
            Id = d.Id,
            Type = d.Type,
            Status = d.Status,
            OriginalFileName = d.OriginalFileName,
            ContentType = d.ContentType,
            SizeBytes = d.SizeBytes,
            RejectionReason = d.RejectionReason,
            UploadedUtc = d.UploadedUtc,
            ReviewedUtc = d.ReviewedUtc
        };

    private static void ApplyDocumentDecisions(KycProfile profile, List<AdminKycDocumentDecision> decisions)
    {
        var dict = decisions.ToDictionary(x => x.DocumentId, x => x);

        foreach (var doc in profile.Documents)
        {
            if (!dict.TryGetValue(doc.Id, out var decision))
                continue;

            if (decision.Status != KycDocumentStatus.Accepted && decision.Status != KycDocumentStatus.Rejected)
                throw new InvalidOperationException("Document decision status must be Accepted or Rejected.");

            doc.Status = decision.Status;
            doc.RejectionReason = decision.Status == KycDocumentStatus.Rejected
                ? (decision.RejectionReason ?? "Rejected")
                : null;

            doc.ReviewedUtc = DateTime.UtcNow;
        }
    }
}