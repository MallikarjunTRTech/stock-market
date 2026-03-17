// Contracts/KycDocumentReuploadRequest.cs
using System.ComponentModel.DataAnnotations;
namespace SafeSend.Stock.Api.Contracts;

public sealed class KycDocumentReuploadRequest
{
    [Required]
    public IFormFile File { get; set; } = null!;
}