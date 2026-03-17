using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace SafeSend.Stock.Api.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = "Admin")]
public sealed class AdminUsersController : ControllerBase
{
    [HttpPost("{email}/make-admin")]
    public async Task<IActionResult> MakeAdmin(
        [FromRoute] string email,
        [FromServices] UserManager<IdentityUser> userManager,
        [FromServices] RoleManager<IdentityRole> roleManager)
    {
        email = (email ?? "").Trim();

        var user = await userManager.FindByEmailAsync(email);
        if (user is null) return NotFound("User not found.");

        if (!await roleManager.RoleExistsAsync("Admin"))
        {
            var createdRole = await roleManager.CreateAsync(new IdentityRole("Admin"));
            if (!createdRole.Succeeded)
                return StatusCode(500, createdRole.Errors.Select(e => e.Description));
        }

        var result = await userManager.AddToRoleAsync(user, "Admin");
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        return Ok(new { message = $"{email} is now an Admin." });
    }
}