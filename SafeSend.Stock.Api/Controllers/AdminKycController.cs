using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SafeSend.Stock.Api.Contracts;
using SafeSend.Stock.Api.Models;
using SafeSend.Stock.Api.Services;

namespace SafeSend.Stock.Api.Controllers;

[ApiController]
[Route("api/admin/kyc")]
[Authorize(Roles = "Admin")]
public sealed class AdminKycController : ControllerBase
{
    private readonly KycService _kyc;

    public AdminKycController(KycService kyc)
    {
        _kyc = kyc;
    }

    [HttpGet]
    public async Task<ActionResult<List<AdminKycListItemResponse>>> List(
        [FromQuery] KycStatus? status,
        [FromQuery] int take = 200,
        CancellationToken ct = default)
    {
        var resp = await _kyc.AdminListAsync(status, take, ct);
        return Ok(resp);
    }

    [HttpGet("{kycProfileId:guid}")]
    public async Task<ActionResult<AdminKycProfileResponse>> Get(Guid kycProfileId, CancellationToken ct)
    {
        var resp = await _kyc.AdminGetAsync(kycProfileId, ct);
        if (resp is null)
            return NotFound(Problem(title: "Not found", detail: "KYC profile not found."));

        return Ok(resp);
    }

    [HttpPost("{kycProfileId:guid}/approve")]
    public async Task<ActionResult> Approve(
        Guid kycProfileId,
        [FromBody] AdminKycDecisionRequest request,
        CancellationToken ct)
    {
        try
        {
            await _kyc.AdminApproveAsync(kycProfileId, request, ct);
            return Ok(new { ok = true });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(Problem(title: "Cannot approve KYC", detail: ex.Message));
        }
    }

    [HttpPost("{kycProfileId:guid}/reject")]
    public async Task<ActionResult> Reject(
        Guid kycProfileId,
        [FromBody] AdminKycDecisionRequest request,
        CancellationToken ct)
    {
        try
        {
            await _kyc.AdminRejectAsync(kycProfileId, request, ct);
            return Ok(new { ok = true });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(Problem(title: "Cannot reject KYC", detail: ex.Message));
        }
    }

    [HttpGet("documents/{documentId:guid}/download")]
    public async Task<IActionResult> Download(Guid documentId, CancellationToken ct)
    {
        try
        {
            var (stream, contentType, fileName) = await _kyc.AdminDownloadDocumentAsync(documentId, ct);

            // Tells browser to display it inline (PDF/image preview) instead of forcing download
            Response.Headers.Append("Content-Disposition", $"inline; filename=\"{fileName}\"");

            return File(stream, contentType, fileName);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(Problem(title: "Not found", detail: "Document not found."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(Problem(title: "Cannot retrieve document", detail: ex.Message));
        }
    }

    // Fixed: Admin should use AdminDeleteDocumentAsync, not DeleteMyDocumentAsync
    // DeleteMyDocumentAsync is user-scoped and does an ownership check which will always fail for admin
    [HttpDelete("documents/{documentId:guid}")]
    public async Task<ActionResult> DeleteDocument(Guid documentId, CancellationToken ct)
    {
        try
        {
            await _kyc.AdminDeleteDocumentAsync(documentId, ct);  // no userId needed
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            if (ex.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                return NotFound(Problem(title: "Not found", detail: ex.Message));

            return Conflict(Problem(title: "Cannot delete document", detail: ex.Message));
        }
    }
}