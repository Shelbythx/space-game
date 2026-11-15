using System.Reflection;
using SpaceGame.Api.Advisor;

namespace SpaceGame.Api.Endpoints;

/// <summary><c>GET /api/health</c> — перевірка й пробудження сервера (docs/api.md).</summary>
public static class HealthEndpoints
{
    /// <summary><c>Advisor</c> (v2.3) — режим наставника: <c>claude</c> або <c>demo</c>.</summary>
    public sealed record HealthResponse(string Status, string Version, string Advisor);

    public static readonly string Version =
        typeof(HealthEndpoints).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion.Split('+')[0]
        ?? "0.0.0";

    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/health", (IAdvisorModel advisor) => new HealthResponse("ok", Version, advisor.Name))
            .WithName("GetHealth")
            .WithTags("Health");
        return app;
    }
}
