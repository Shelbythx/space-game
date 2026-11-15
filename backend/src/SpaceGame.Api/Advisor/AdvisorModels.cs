using SpaceGame.Api.Catalogs;
using SpaceGame.Api.Simulation.Model;

namespace SpaceGame.Api.Advisor;

// ШІ-наставник (docs/api.md 2.3, D111): запити й відповідь як у контракті.

public sealed record AdvisorTurn(string From, string Text);

public sealed record AdvisorAskRequest(Guid PlayerId, string Language, Design Design, string Question, IReadOnlyList<AdvisorTurn>? History);

public sealed record AdvisorReportRequest(Guid PlayerId, string Language, Design Design, long Seed);

/// <summary><c>claude</c> — <c>Text</c> від моделі; <c>demo</c> — <c>Messages</c> з переліку кодів.</summary>
public sealed record AdvisorAnswer(string Source, string? Text, IReadOnlyList<Message> Messages)
{
    public static AdvisorAnswer Claude(string text) => new(AdvisorSources.Claude, text, []);

    public static AdvisorAnswer Demo(IReadOnlyList<Message> messages) => new(AdvisorSources.Demo, null, messages);
}

public static class AdvisorSources
{
    public const string Claude = "claude";
    public const string Demo = "demo";
}

public static class AdvisorLimits
{
    public const int QuestionMaxLength = 500;
    public const int HistoryMaxTurns = 6;
    public const int TurnMaxLength = 2000;
    public const int QuestionsPerHour = 30;

    public static readonly IReadOnlySet<string> Languages = new HashSet<string>(StringComparer.Ordinal) { "en", "uk" };
}

/// <summary>Одна репліка для моделі: <c>user</c> або <c>assistant</c>.</summary>
public sealed record ModelTurn(string Role, string Text);

/// <summary>
/// Мовна модель за наставником. <see cref="Name"/> — режим для <c>/api/health</c>; відповідь
/// <c>null</c> — моделі немає або виклик не вдався, тоді наставник відповідає в демо-режимі.
/// </summary>
public interface IAdvisorModel
{
    string Name { get; }

    Task<string?> CompleteAsync(string system, IReadOnlyList<ModelTurn> turns, CancellationToken ct);
}

/// <summary>Ключа Anthropic API немає — лише демо.</summary>
public sealed class NoAdvisorModel : IAdvisorModel
{
    public string Name => AdvisorSources.Demo;

    public Task<string?> CompleteAsync(string system, IReadOnlyList<ModelTurn> turns, CancellationToken ct) =>
        Task.FromResult<string?>(null);
}
