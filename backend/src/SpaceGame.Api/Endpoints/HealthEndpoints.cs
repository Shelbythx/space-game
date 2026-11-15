using System.Reflection;

namespace SpaceGame.Api.Endpoints;

/// <summary><c>GET /api/health</c> — перевірка й пробудження сервера (docs/api.md).</summary>
public static class HealthEndpoints
{
    public sealed record HealthResponse(string Status, string Version);

    public static readonly string Version =
        typeof(HealthEndpoints).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion.Split('+')[0]
        ?? "0.0.0";

    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/health", () => new HealthResponse("ok", Version))
            .WithName("GetHealth")
            .WithTags("Health");
        return app;
    }
}
