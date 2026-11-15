using Anthropic;
using Anthropic.Models.Beta;
using Anthropic.Models.Beta.Messages;

namespace SpaceGame.Api.Advisor;

/// <summary>
/// Claude Sonnet 5.5 через офіційний SDK Anthropic (D111). Ключ — лише зі змінної середовища
/// <c>ANTHROPIC_API_KEY</c> (налаштування Azure App Service), у коді й репозиторії його немає.
/// Будь-яка помилка, відмова чи порожня відповідь — <c>null</c>: наставник відповість у демо-режимі.
/// </summary>
public sealed class ClaudeAdvisorModel(AnthropicClient client, string model, ILogger<ClaudeAdvisorModel> log) : IAdvisorModel
{
    public const string DefaultModel = "claude-sonnet-5-5";
    public const int MaxTokens = 1500;

    public string Name => AdvisorSources.Claude;

    public async Task<string?> CompleteAsync(string system, IReadOnlyList<ModelTurn> turns, CancellationToken ct)
    {
        try
        {
            var messages = turns
                .Select(t => t.Role == "assistant"
                    ? (BetaMessageParam)new BetaAssistantMessageParam { Content = t.Text }
                    : new BetaUserMessageParam { Content = t.Text })
                .ToList();

            var response = await client.Beta.Messages.Create(new MessageCreateParams
            {
                Model = model,
                MaxTokens = MaxTokens,
                System = new List<BetaTextBlockParam> { new() { Text = system, CacheControl = new BetaCacheControlEphemeral() } },
                Messages = messages,
                // Пояснення за готовими даними — глибокі роздуми не потрібні, а відповідь швидша.
                OutputConfig = new BetaOutputConfig { Effort = Effort.Low },
                // Якщо класифікатор безпеки відхилить запит, сервер Anthropic сам відповість іншою моделлю.
                Betas = [AnthropicBeta.ServerSideFallback2026_07_01],
                Fallbacks = new Default(),
            }, ct);

            if (response.StopReason == "refusal")
            {
                log.LogWarning("Advisor: Claude declined the request");
                return null;
            }
            var text = string.Join("\n\n", response.Content
                .Select(b => b.TryPickText(out var t) ? t.Text : null)
                .Where(t => !string.IsNullOrWhiteSpace(t)));
            return string.IsNullOrWhiteSpace(text) ? null : text.Trim();
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception e)
        {
            log.LogWarning(e, "Advisor: Claude call failed, answering in demo mode");
            return null;
        }
    }
}
