using Microsoft.AspNetCore.Http.HttpResults;
using SpaceGame.Api.Catalogs;
using SpaceGame.Api.Simulation.Model;

namespace SpaceGame.Api.Simulation;

/// <summary><c>POST /api/evaluate</c> — миттєві наслідки проєкту (docs/api.md).</summary>
public static class EvaluateEndpoints
{
    public static IEndpointRouteBuilder MapEvaluateEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/evaluate", Results<Ok<Evaluation>, ValidationProblem> (Design design, IMissionCatalog catalog) =>
            {
                var errors = DesignValidator.Validate(design, catalog, out var mission);
                if (errors.Count > 0 || mission is null)
                    return TypedResults.ValidationProblem(errors.ToDictionary(e => e.Key, e => e.Value.ToArray()));
                return TypedResults.Ok(Evaluator.Evaluate(design, mission).Evaluation);
            })
            .WithName("Evaluate")
            .WithTags("Simulation");
        return app;
    }
}
