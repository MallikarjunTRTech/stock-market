using System.Security.Claims;

namespace SafeSend.Stock.Api.Common;

public static class ClaimsPrincipalExtensions
{
    //When a user logs in, their identity is stored as claims 
    public static string RequireUserId(this ClaimsPrincipal user)
        => user.FindFirstValue(ClaimTypes.NameIdentifier)
           ?? throw new InvalidOperationException("Missing user id claim.");
}