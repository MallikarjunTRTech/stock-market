using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SafeSend.Stock.Api.Contracts;
using SafeSend.Stock.Api.Models;
using SafeSend.Stock.Api.Services;

namespace SafeSend.Stock.Api.Controllers;

[ApiController]
[Route("api/kyc")]
[Authorize]
public sealed class KycController : ControllerBase
{
    private readonly KycService _kyc;

    public KycController(KycService kyc)
    {
        _kyc = kyc;
    }

    private bool TryGetUserId(out string userId)
    {
        userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        return !string.IsNullOrWhiteSpace(userId);
    }

    private bool TryGetUserName(out string userName)
    {
        userName = User.FindFirstValue(ClaimTypes.Name) ?? string.Empty;
        return !string.IsNullOrWhiteSpace(userName);
    }

    [HttpGet("me")]
    public async Task<ActionResult<KycProfileResponse>> Me(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(Problem(title: "Unauthorized", detail: "Missing user id claim."));

        var resp = await _kyc.GetMyAsync(userId, ct);
        return Ok(resp);
    }

    [HttpPut("profile")]
    public async Task<ActionResult<KycProfileResponse>> UpsertProfile(
        [FromBody] KycProfileUpsertRequest request,
        CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(Problem(title: "Unauthorized", detail: "Missing user id claim."));

        try
        {
            var resp = await _kyc.UpsertMyProfileAsync(userId, request, ct);
            return Ok(resp);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(Problem(title: "KYC update not allowed", detail: ex.Message));
        }
    }

    [HttpPost("documents")]
    [RequestSizeLimit(10_000_000)]
    public async Task<ActionResult<KycDocumentResponse>> UploadDocument(
        [FromForm] KycDocumentUploadRequest request,
        CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(Problem(title: "Unauthorized", detail: "Missing user id claim."));

        var userName = User.FindFirstValue(ClaimTypes.Name) ?? userId;

        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg", "image/png", "application/pdf"
        };

        if (!allowed.Contains(request.File.ContentType))
            return BadRequest(Problem(title: "Invalid file type", detail: "Only JPEG, PNG, or PDF files are allowed."));

        try
        {
            var resp = await _kyc.UploadMyDocumentAsync(userId, userName, request.Type, request.File, ct);
            return Ok(resp);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(Problem(title: "Upload not allowed", detail: ex.Message));
        }
    }

    // ── NEW ───────────────────────────────────────────────────────────────────
    [HttpPut("documents/{documentId:guid}/reupload")]
    [RequestSizeLimit(10_000_000)]
    public async Task<ActionResult<KycDocumentResponse>> ReuploadDocument(
        Guid documentId,
        [FromForm] KycDocumentReuploadRequest request,
        CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(Problem(title: "Unauthorized", detail: "Missing user id claim."));

        var userName = User.FindFirstValue(ClaimTypes.Name) ?? userId;

        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg", "image/png", "application/pdf"
        };

        if (!allowed.Contains(request.File.ContentType))
            return BadRequest(Problem(title: "Invalid file type", detail: "Only JPEG, PNG, or PDF files are allowed."));

        try
        {
            var resp = await _kyc.ReuploadMyDocumentAsync(userId, userName, documentId, request.File, ct);
            return Ok(resp);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(Problem(title: "Not found", detail: ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(Problem(title: "Re-upload not allowed", detail: ex.Message));
        }
    }
    // ─────────────────────────────────────────────────────────────────────────

    [HttpGet("documents")]
    public async Task<ActionResult<List<KycDocumentResponse>>> GetMyDocuments(CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(Problem(title: "Unauthorized", detail: "Missing user id claim."));

        var resp = await _kyc.GetMyDocumentsAsync(userId, ct);
        return Ok(resp);
    }

    [HttpGet("documents/{documentId:guid}")]
    public async Task<ActionResult<KycDocumentResponse>> GetMyDocument(Guid documentId, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(Problem(title: "Unauthorized", detail: "Missing user id claim."));

        var resp = await _kyc.GetMyDocumentAsync(userId, documentId, ct);

        if (resp is null)
            return NotFound(Problem(title: "Not found", detail: "Document not found."));

        return Ok(resp);
    }

    [HttpPost("submit")]
    public async Task<ActionResult<KycSubmitResponse>> Submit(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(Problem(title: "Unauthorized", detail: "Missing user id claim."));

        try
        {
            var resp = await _kyc.SubmitMyAsync(userId, ct);
            return Ok(resp);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(Problem(title: "Cannot submit KYC", detail: ex.Message));
        }
    }
}