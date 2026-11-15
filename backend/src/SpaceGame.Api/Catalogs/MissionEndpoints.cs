using Microsoft.AspNetCore.Http.HttpResults;

namespace SpaceGame.Api.Catalogs;

/// <summary><c>GET /api/missions</c> і <c>GET /api/missions/{id}</c> (docs/api.md).</summary>
public static class MissionEndpoints
{
    public static IServiceCollection AddCatalogs(this IServiceCollection services) =>
        services.AddSingleton<IMissionCatalog, MissionCatalog>();

    public static IEndpointRouteBuilder MapMissionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/missions").WithTags("Missions");

        group.MapGet("/", (IMissionCatalog catalog) =>
                catalog.All.Select(m => m.ToSummary()).ToList())
            .WithName("GetMissions");

        group.MapGet("/{id}", Results<Ok<Mission>, ProblemHttpResult> (string id, IMissionCatalog catalog) =>
                catalog.Find(id) is { } mission
                    ? TypedResults.Ok(mission)
                    : TypedResults.Problem(statusCode: StatusCodes.Status404NotFound, title: "mission.notFound",
                        detail: $"Mission '{id}' not found"))
            .WithName("GetMission");

        return app;
    }
}
