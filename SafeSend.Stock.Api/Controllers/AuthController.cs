using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using SafeSend.Stock.Api.Features.Auth;

namespace SafeSend.Stock.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromServices] UserManager<IdentityUser> userManager,
        [FromServices] RoleManager<IdentityRole> roleManager,
        [FromBody] RegisterRequest req)
    {
        var email = (req.Email ?? "").Trim();

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest("Email and password are required.");

        // Prevent duplicate accounts (optional but helpful)
        var existing = await userManager.FindByEmailAsync(email);
        if (existing is not null)
            return Conflict("User already exists.");

        var user = new IdentityUser { UserName = email, Email = email, EmailConfirmed = true };

        var result = await userManager.CreateAsync(user, req.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        // Ensure "User" role exists (your IdentitySeeder should do this already,
        // but keeping this makes registration robust even if seeding didn't run)
        if (!await roleManager.RoleExistsAsync("User"))
        {
            var createRole = await roleManager.CreateAsync(new IdentityRole("User"));
            if (!createRole.Succeeded)
                return StatusCode(500, createRole.Errors.Select(e => e.Description));
        }

        // Assign default role
        var addRole = await userManager.AddToRoleAsync(user, "User");
        if (!addRole.Succeeded)
            return StatusCode(500, addRole.Errors.Select(e => e.Description));

        return Ok(new { message = "Registration successful." });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromServices] UserManager<IdentityUser> userManager,
        [FromServices] SignInManager<IdentityUser> signInManager,
        [FromServices] TokenService tokenService,
        [FromBody] LoginRequest req)
    {
        var email = (req.Email ?? "").Trim();
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest("Email and password are required.");

        var user = await userManager.FindByEmailAsync(email);
        if (user is null) return Unauthorized();

        var ok = await signInManager.CheckPasswordSignInAsync(user, req.Password, lockoutOnFailure: false);
        if (!ok.Succeeded) return Unauthorized();

        var token = await tokenService.CreateTokenAsync(user);

        return Ok(new { token });
    }
}