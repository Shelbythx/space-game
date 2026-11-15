using System.Collections.Concurrent;
using Anthropic;
using SpaceGame.Api.Catalogs;
using SpaceGame.Api.Simulation;

namespace SpaceGame.Api.Advisor;

/// <summary>Не більше <see cref="AdvisorLimits.QuestionsPerHour"/> звернень гравця за годину (захист бюджету API).</summary>
public sealed class AdvisorRateLimiter(TimeProvider clock)
{
    private readonly ConcurrentDictionary<Guid, Queue<DateTimeOffset>> _calls = new();

    public bool TryTake(Guid playerId)
    {
        var now = clock.GetUtcNow();
        var queue = _calls.GetOrAdd(playerId, _ => new Queue<DateTimeOffset>());
        lock (queue)
        {
            while (queue.Count > 0 && now - queue.Peek() >= TimeSpan.FromHours(1))
                queue.Dequeue();
            if (queue.Count >= AdvisorLimits.QuestionsPerHour)
                return false;
            queue.Enqueue(now);
            return true;
        }
    }
}

/// <summary><c>/api/advisor/…</c> — ШІ-наставник (docs/api.md 2.3, D111).</summary>
public static class AdvisorEndpoints
{
    /// <summary>
    /// Claude — лише коли задано <c>ANTHROPIC_API_KEY</c>; інакше демо. Модель можна змінити
    /// змінною <c>Advisor__Model</c> (за замовчуванням Claude Sonnet 5.5).
    /// </summary>
    public static IServiceCollection AddAdvisor(this IServiceCollection services, IConfiguration config)
    {
        services.AddSingleton<AdvisorRateLimiter>();
        var key = config["ANTHROPIC_API_KEY"];
        if (string.IsNullOrWhiteSpace(key))
            return services.AddSingleton<IAdvisorModel, NoAdvisorModel>();

        var model = config["Advisor:Model"] ?? ClaudeAdvisorModel.DefaultModel;
        return services.AddSingleton<IAdvisorModel>(sp => new ClaudeAdvisorModel(
            new AnthropicClient { ApiKey = key, MaxRetries = 1, Timeout = TimeSpan.FromSeconds(40) },
            model,
            sp.GetRequiredService<ILogger<ClaudeAdvisorModel>>()));
    }

    public static IEndpointRouteBuilder MapAdvisorEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/advisor").WithTags("Advisor");

        group.MapPost("/ask", async (AdvisorAskRequest request, IMissionCatalog catalog, IAdvisorModel model, AdvisorRateLimiter limiter, CancellationToken ct) =>
            {
                var errors = Common(request.PlayerId, request.Language);
                var question = request.Question?.Trim() ?? "";
                if (question.Length == 0)
                    errors["question"] = ["advisor.questionEmpty"];
                else if (question.Length > AdvisorLimits.QuestionMaxLength)
                    errors["question"] = ["advisor.questionTooLong"];
                var history = request.History ?? [];
                if (history.Count > AdvisorLimits.HistoryMaxTurns || history.Any(t => t.Text is null || t.Text.Length > AdvisorLimits.TurnMaxLength))
                    errors["history"] = ["advisor.historyTooLong"];
                var designErrors = DesignValidator.Validate(request.Design, catalog, out var mission);
                foreach (var (k, v) in designErrors)
                    errors[k] = [.. v];
                if (errors.Count > 0 || mission is null)
                    return Results.ValidationProblem(errors);
                if (!limiter.TryTake(request.PlayerId))
                    return Results.Problem(statusCode: StatusCodes.Status429TooManyRequests, title: "advisor.tooMany");

                var evaluation = Evaluator.Evaluate(request.Design, mission).Evaluation;
                var turns = AdvisorPrompt.AskTurns(history, AdvisorPrompt.AskData(mission, request.Design, evaluation), question, request.Language);
                var text = await model.CompleteAsync(AdvisorPrompt.System, turns, ct);
                return Results.Ok(text is null ? DemoAdvisor.Ask(evaluation, question) : AdvisorAnswer.Claude(text));
            })
            .WithName("AdvisorAsk")
            .Produces<AdvisorAnswer>()
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        group.MapPost("/report", async (AdvisorReportRequest request, IMissionCatalog catalog, ISpaceWeatherSource weather, IAdvisorModel model, AdvisorRateLimiter limiter, CancellationToken ct) =>
            {
                var errors = Common(request.PlayerId, request.Language);
                var designErrors = DesignValidator.Validate(request.Design, catalog, out var mission);
                foreach (var (k, v) in designErrors)
                    errors[k] = [.. v];
                if (errors.Count > 0 || mission is null)
                    return Results.ValidationProblem(errors);
                if (!limiter.TryTake(request.PlayerId))
                    return Results.Problem(statusCode: StatusCodes.Status429TooManyRequests, title: "advisor.tooMany");

                // Той самий проєкт і seed — той самий політ (D65): звіт рахує бекенд, а не клієнт.
                var result = await SimulateEndpoints.RunAsync(request.Design, mission, request.Seed, weather, ct);
                var evaluation = Evaluator.Evaluate(request.Design, mission).Evaluation;
                var turns = AdvisorPrompt.ReportTurns(AdvisorPrompt.ReportData(mission, request.Design, evaluation, result), request.Language);
                var text = await model.CompleteAsync(AdvisorPrompt.System, turns, ct);
                return Results.Ok(text is null ? DemoAdvisor.Report(result.Report, evaluation) : AdvisorAnswer.Claude(text));
            })
            .WithName("AdvisorReport")
            .Produces<AdvisorAnswer>()
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        return app;
    }

    private static Dictionary<string, string[]> Common(Guid playerId, string? language)
    {
        var errors = new Dictionary<string, string[]>();
        if (playerId == Guid.Empty)
            errors["playerId"] = ["advisor.playerIdRequired"];
        if (language is null || !AdvisorLimits.Languages.Contains(language))
            errors["language"] = ["advisor.badLanguage"];
        return errors;
    }
}
