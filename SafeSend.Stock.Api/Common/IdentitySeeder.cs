using Microsoft.AspNetCore.Identity;

public static class IdentitySeeder
{
    //This is a database seeding method in C# that automatically creates roles and users when the app starts.
    public static async Task SeedAsync(IServiceProvider services)
    {

        using var scope = services.CreateScope();

        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();

        string[] roles = ["Admin", "User"];

        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                var roleResult = await roleManager.CreateAsync(new IdentityRole(role));
                if (!roleResult.Succeeded)
                    throw new Exception(string.Join("; ", roleResult.Errors.Select(e => e.Description)));
            }
        }

        // Dev default admin user
        var adminEmail = "admin@safesend.local";
        var adminUser = await userManager.FindByEmailAsync(adminEmail);

        if (adminUser is null)
        {
            adminUser = new IdentityUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                EmailConfirmed = true
            };

            var created = await userManager.CreateAsync(adminUser, "Admin@12345");
            if (!created.Succeeded)
                throw new Exception(string.Join("; ", created.Errors.Select(e => e.Description)));
        }

        if (!await userManager.IsInRoleAsync(adminUser, "Admin"))
        {
            var addRoleResult = await userManager.AddToRoleAsync(adminUser, "Admin");
            if (!addRoleResult.Succeeded)
                throw new Exception(string.Join("; ", addRoleResult.Errors.Select(e => e.Description)));
        }
    }
}