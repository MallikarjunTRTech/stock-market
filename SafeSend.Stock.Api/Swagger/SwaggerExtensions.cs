using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace SafeSend.Stock.Api.Swagger;

public static class SwaggerExtensions
{
    public static IServiceCollection AddSwaggerWithJwt(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();

        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "SafeSend.Stock.Api",
                Version = "v1"
            });

            // Quality-of-life
            c.SupportNonNullableReferenceTypes();
            c.UseInlineDefinitionsForEnums();

            // IMPORTANT: Make enums appear as strings in Swagger (Passport, NationalId, etc.)
            c.SchemaFilter<EnumAsStringSchemaFilter>();

            // JWT bearer auth in Swagger UI
            c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "Enter: Bearer {token}"
            });

            c.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    },
                    Array.Empty<string>()
                }
            });
        });

        return services;
    }

    public static WebApplication UseSwaggerUiInDev(this WebApplication app)
    {
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "SafeSend.Stock.Api v1");
            });
        }

        return app;
    }
}

/// <summary>
/// Forces enums to be represented as string names in Swagger schema.
/// This avoids users seeing int32 values (1,2,3...) for enum fields.
/// </summary>
public sealed class EnumAsStringSchemaFilter : ISchemaFilter
{
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        var type = context.Type;
        var enumType = Nullable.GetUnderlyingType(type) ?? type;

        if (!enumType.IsEnum)
            return;

        schema.Type = "string";
        schema.Format = null;

        var names = Enum.GetNames(enumType);
        schema.Enum = names.Select(n => (IOpenApiAny)new OpenApiString(n)).ToList();

        var allowed = string.Join(", ", names);
        schema.Description = string.IsNullOrWhiteSpace(schema.Description)
            ? $"Allowed values: {allowed}"
            : $"{schema.Description} Allowed values: {allowed}";
    }
}