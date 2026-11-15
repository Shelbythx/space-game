using Microsoft.AspNetCore.Http.HttpResults;
using SpaceGame.Api.Catalogs;
using SpaceGame.Api.Simulation.Model;

namespace SpaceGame.Api.Simulation;

/// <summary>Джерело магнітних бур для симуляції (D83). Реалізація з NASA DONKI — задача 021.</summary>
public interface ISpaceWeatherSource
{
    Task<SpaceWeatherData> GetAsync(long seed, int days, CancellationToken ct);
}

/// <summary>Без бур — до готовності задачі 021.</summary>
public sealed class NoSpaceWeather : ISpaceWeatherSource
{
    public Task<SpaceWeatherData> GetAsync(long seed, int days, CancellationToken ct) =>
        Task.FromResult(SpaceWeatherData.None(DateOnly.FromDateTime(Simulator.BaseEpoch)));
}

/// <summary><c>POST /api/simulate</c> — симуляція місії в часі та звіт (docs/api.md).</summary>
public static class SimulateEndpoints
{
    public static IEndpointRouteBuilder MapSimulateEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/simulate", async Task<Results<Ok<SimulationResult>, ValidationProblem>> (
                SimulationRequest request, IMissionCatalog catalog, ISpaceWeatherSource weather, CancellationToken ct) =>
            {
                var errors = DesignValidator.Validate(request.Design, catalog, out var mission);
                if (errors.Count > 0 || mission is null)
                    return TypedResults.ValidationProblem(errors.ToDictionary(e => e.Key, e => e.Value.ToArray()));
                var result = await RunAsync(request.Design, mission, request.Seed, weather, ct);
                return TypedResults.Ok(result);
            })
            .WithName("Simulate")
            .WithTags("Simulation");
        return app;
    }

    /// <summary>Спільний запуск симуляції (також для спроб, задача 006).</summary>
    public static async Task<SimulationResult> RunAsync(Design design, Mission mission, long? seed, ISpaceWeatherSource weather, CancellationToken ct)
    {
        var actualSeed = seed ?? Random.Shared.NextInt64(1, 1_000_000_000);
        var days = (int)Math.Ceiling((mission.Goal.OperationMonths ?? 1) * Physics.Constants.DaysPerMonth) + 1;
        var spaceWeather = await weather.GetAsync(actualSeed, days, ct);
        return Simulator.Simulate(design, mission, actualSeed, spaceWeather);
    }
}
