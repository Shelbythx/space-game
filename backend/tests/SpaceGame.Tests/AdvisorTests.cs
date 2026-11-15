using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SpaceGame.Api.Advisor;
using SpaceGame.Api.Catalogs;

namespace SpaceGame.Tests;

/// <summary>ШІ-наставник (docs/api.md 2.3, D111, задача 048). Справжній Anthropic API не викликається.</summary>
public sealed class AdvisorTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly Design Camera = new MissionCatalog().Find("sat-orbit")!.Presets[1].Design;

    private static readonly string[] KnownPrefixes = ["advisor.", "check.", "comment.", "advice.", "calc.", "chain.", "bottleneck."];

    private HttpClient Client(IAdvisorModel? model = null) =>
        model is null
            ? factory.WithWebHostBuilder(b => b.ConfigureServices(s => s.Replace(ServiceDescriptor.Singleton<IAdvisorModel, NoAdvisorModel>()))).CreateClient()
            : factory.WithWebHostBuilder(b => b.ConfigureServices(s => s.Replace(ServiceDescriptor.Singleton(model)))).CreateClient();

    private static object Ask(string question, object[]? history = null, string language = "uk", Guid? player = null) =>
        new { playerId = player ?? Guid.NewGuid(), language, design = Camera, question, history = history ?? [] };

    private static async Task<JsonElement> Json(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    private static string[] Codes(JsonElement answer) =>
        answer.GetProperty("messages").EnumerateArray().Select(m => m.GetProperty("code").GetString()!).ToArray();

    [Fact]
    public async Task Health_ReportsDemoWithoutKey()
    {
        using var client = Client();
        var health = await client.GetFromJsonAsync<JsonElement>("/api/health");
        Assert.Equal("demo", health.GetProperty("advisor").GetString());
    }

    [Fact]
    public async Task Ask_Demo_FocusesOnTheResourceInTheQuestion()
    {
        using var client = Client();
        var answer = await Json(await client.PostAsJsonAsync("/api/advisor/ask", Ask("Чому батареї не вистачає в тіні?")));

        Assert.Equal("demo", answer.GetProperty("source").GetString());
        Assert.Equal(JsonValueKind.Null, answer.GetProperty("text").ValueKind);
        var codes = Codes(answer);
        Assert.Equal("advisor.demo.focus.power", codes[0]);
        Assert.True(codes.Length > 1);
        Assert.All(codes, c => Assert.Contains(KnownPrefixes, p => c.StartsWith(p, StringComparison.Ordinal)));
        Assert.True(codes.Length <= DemoAdvisor.MaxMessages);
    }

    [Fact]
    public async Task Ask_Demo_WithoutKnownResource_ListsMainProblems()
    {
        using var client = Client();
        var answer = await Json(await client.PostAsJsonAsync("/api/advisor/ask", Ask("What should I do first?", language: "en")));
        var codes = Codes(answer);
        Assert.Contains(codes[0], new[] { "advisor.demo.intro", "advisor.demo.allGood" });
    }

    [Fact]
    public async Task Report_Demo_StartsWithOutcomeAndBottleneck()
    {
        using var client = Client();
        var response = await client.PostAsJsonAsync("/api/advisor/report", new { playerId = Guid.NewGuid(), language = "uk", design = Camera, seed = 12345 });
        var codes = Codes(await Json(response));
        Assert.Contains(codes[0], new[] { "advisor.demo.report.success", "advisor.demo.report.failure" });
        Assert.StartsWith("bottleneck.", codes[1]);
        Assert.All(codes, c => Assert.Contains(KnownPrefixes, p => c.StartsWith(p, StringComparison.Ordinal)));
    }

    [Fact]
    public async Task Ask_Claude_GetsGameDataHistoryAndLanguage()
    {
        var model = new FakeModel("Батарея замала.");
        using var client = Client(model);
        var history = new object[]
        {
            new { from = "advisor", text = "Вітаю!" },
            new { from = "player", text = "Що з бюджетом?" },
            new { from = "advisor", text = "Бюджет перевищено." },
        };
        var answer = await Json(await client.PostAsJsonAsync("/api/advisor/ask", Ask("А батарея?", history)));

        Assert.Equal("claude", answer.GetProperty("source").GetString());
        Assert.Equal("Батарея замала.", answer.GetProperty("text").GetString());
        Assert.Empty(answer.GetProperty("messages").EnumerateArray());

        var turns = Assert.Single(model.Calls);
        // Початкова репліка наставника відкинута: розмова починається з гравця й чергується.
        Assert.Equal(["user", "assistant", "user"], turns.Select(t => t.Role));
        Assert.Equal("Що з бюджетом?", turns[0].Text);
        Assert.Contains("Game data (JSON)", turns[2].Text);
        Assert.Contains("\"calc\"", turns[2].Text);
        Assert.Contains("Question: А батарея?", turns[2].Text);
        Assert.EndsWith("Answer in Ukrainian.", turns[2].Text);
        Assert.Contains("Use only numbers and facts present in the game data", model.System);
    }

    [Fact]
    public async Task Report_Claude_GetsTheReport()
    {
        var model = new FakeModel("Місія вдалася.");
        using var client = Client(model);
        var answer = await Json(await client.PostAsJsonAsync("/api/advisor/report", new { playerId = Guid.NewGuid(), language = "en", design = Camera, seed = 7 }));
        Assert.Equal("claude", answer.GetProperty("source").GetString());
        var turn = Assert.Single(Assert.Single(model.Calls));
        Assert.Contains("\"report\"", turn.Text);
        Assert.Contains("\"bottleneck\"", turn.Text);
        Assert.EndsWith("Answer in English.", turn.Text);
    }

    [Fact]
    public async Task Claude_Failure_FallsBackToDemo()
    {
        using var client = Client(new FakeModel(null));
        var answer = await Json(await client.PostAsJsonAsync("/api/advisor/ask", Ask("Скільки коштує місія?")));
        Assert.Equal("demo", answer.GetProperty("source").GetString());
        Assert.Equal("advisor.demo.focus.budget", Codes(answer)[0]);
    }

    [Theory]
    [InlineData("", "uk", 0, "question", "advisor.questionEmpty")]
    [InlineData("long", "uk", 0, "question", "advisor.questionTooLong")]
    [InlineData("ok?", "pl", 0, "language", "advisor.badLanguage")]
    [InlineData("ok?", "uk", 7, "history", "advisor.historyTooLong")]
    public async Task Ask_RejectsBadRequests(string question, string language, int historyTurns, string field, string code)
    {
        using var client = Client();
        var q = question == "long" ? new string('?', AdvisorLimits.QuestionMaxLength + 1) : question;
        var history = Enumerable.Range(0, historyTurns).Select(i => (object)new { from = i % 2 == 0 ? "player" : "advisor", text = "x" }).ToArray();
        var response = await client.PostAsJsonAsync("/api/advisor/ask", Ask(q, history, language));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var errors = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");
        Assert.Equal(code, errors.GetProperty(field)[0].GetString());
    }

    [Fact]
    public async Task Ask_RejectsEmptyPlayer()
    {
        using var client = Client();
        var response = await client.PostAsJsonAsync("/api/advisor/ask", Ask("ok?", player: Guid.Empty));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Ask_LimitsQuestionsPerPlayerPerHour()
    {
        using var client = Client();
        var player = Guid.NewGuid();
        for (var i = 0; i < AdvisorLimits.QuestionsPerHour; i++)
            Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/advisor/ask", Ask("Маса?", player: player))).StatusCode);

        var limited = await client.PostAsJsonAsync("/api/advisor/ask", Ask("Маса?", player: player));
        Assert.Equal((HttpStatusCode)429, limited.StatusCode);
        Assert.Equal("advisor.tooMany", (await limited.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("title").GetString());

        // Інший гравець не обмежений.
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/advisor/ask", Ask("Маса?"))).StatusCode);
    }

    [Theory]
    [InlineData("Як зменшити масу?", "mass")]
    [InlineData("How do I save money?", "budget")]
    [InlineData("Додати ще одну станцію?", "comms")]
    [InlineData("Не вистачає палива для відведення", "propellant")]
    [InlineData("Hello", null)]
    public void Demo_FindsResourceInQuestion(string question, string? resource) =>
        Assert.Equal(resource, DemoAdvisor.ResourceOfQuestion(question));

    private sealed class FakeModel(string? answer) : IAdvisorModel
    {
        public List<IReadOnlyList<ModelTurn>> Calls { get; } = [];
        public string System { get; private set; } = "";

        public string Name => AdvisorSources.Claude;

        public Task<string?> CompleteAsync(string system, IReadOnlyList<ModelTurn> turns, CancellationToken ct)
        {
            System = system;
            Calls.Add(turns);
            return Task.FromResult(answer);
        }
    }
}
