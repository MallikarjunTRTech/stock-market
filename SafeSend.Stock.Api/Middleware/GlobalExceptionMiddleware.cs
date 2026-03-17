using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace SafeSend.Stock.Api.Middleware;
//Global Exception Middleware wraps every HTTP request in a try/catch to intercept any unhandled errors in your app.
//It logs the full error on the server and returns a clean, safe JSON response to the client without exposing sensitive details.
public sealed class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception. TraceId: {TraceId}", context.TraceIdentifier);

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "Unexpected error",
                traceId = context.TraceIdentifier
            });
        }
    }
}