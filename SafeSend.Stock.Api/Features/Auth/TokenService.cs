using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace SafeSend.Stock.Api.Features.Auth;

public sealed class TokenService
{
    //Dependency Injection
    //IConfiguration -> Gives access to appsettings.json(config)
    //UserManager -> build in class gives api's to manage user database
    //With DI, you just ask for what you need in the constructor and the framework handles the rest
    private readonly IConfiguration _config;
    private readonly UserManager<IdentityUser> _userManager;

    public TokenService(IConfiguration config, UserManager<IdentityUser> userManager)
    {
        _config = config;
        _userManager = userManager;
    }

    //Task -> It is like a promise, it returns a value when it is done
    public async Task<string> CreateTokenAsync(IdentityUser user)
    {
        var issuer = _config["Jwt:Issuer"];
        var audience = _config["Jwt:Audience"];
        var keyString = _config["Jwt:Key"];

        if (string.IsNullOrWhiteSpace(issuer) ||
            string.IsNullOrWhiteSpace(audience) ||
            string.IsNullOrWhiteSpace(keyString))
        {
            throw new InvalidOperationException("Missing JWT configuration (Jwt:Issuer, Jwt:Audience, Jwt:Key).");
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email ?? ""),
            new(ClaimTypes.Name, user.UserName ?? user.Email ?? "")
        };

        // ADD ROLES INTO JWT:
        var roles = await _userManager.GetRolesAsync(user);
        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyString));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}