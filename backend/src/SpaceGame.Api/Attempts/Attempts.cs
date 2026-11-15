using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceGame.Api.Catalogs;
using SpaceGame.Api.Data;
using SpaceGame.Api.Simulation;
using SpaceGame.Api.Simulation.Model;

namespace SpaceGame.Api.Attempts;

// Модуль Attempts (задача 006, D60): спроби гравця за анонімним playerId, без реєстрації.

public sealed record AttemptRequest(Guid PlayerId, Design Design, long? Seed);

public sealed record AttemptSummary(Guid Id, DateTimeOffset CreatedAt, long Seed, bool Success, JsonElement Scores, JsonElement Bottleneck);

public sealed record Attempt(Guid Id, DateTimeOffset CreatedAt, Guid PlayerId, JsonElement Design, long Seed, JsonElement Result);

/// <summary>Рядок таблиці <c>attempts</c>: проєкт, seed, підсумок звіту й повний результат (jsonb).</summary>
public sealed class AttemptEntity
{
    public Guid Id { get; set; }
    public Guid PlayerId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public string MissionId { get; set; } = "";
    public long Seed { get; set; }
    public bool Success { get; set; }
    public string Design { get; set; } = "{}";
    public string Scores { get; set; } = "{}";
    public string Bottleneck { get; set; } = "{}";
    public string Result { get; set; } = "{}";

    public AttemptSummary ToSummary() =>
        new(Id, CreatedAt, Seed, Success, Parse(Scores), Parse(Bottleneck));

    public Attempt ToAttempt() => new(Id, CreatedAt, PlayerId, Parse(Design), Seed, Parse(Result));

    private static JsonElement Parse(string json) => JsonDocument.Parse(json).RootElement.Clone();
}

public sealed class AttemptConfiguration : IEntityTypeConfiguration<AttemptEntity>
{
    public void Configure(EntityTypeBuilder<AttemptEntity> b)
    {
        b.ToTable("attempts");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasColumnName("id");
        b.Property(x => x.PlayerId).HasColumnName("player_id");
        b.Property(x => x.CreatedAt).HasColumnName("created_at");
        b.Property(x => x.MissionId).HasColumnName("mission_id").IsRequired();
        b.Property(x => x.Seed).HasColumnName("seed");
        b.Property(x => x.Success).HasColumnName("success");
        b.Property(x => x.Design).HasColumnName("design").HasColumnType("jsonb").IsRequired();
        b.Property(x => x.Scores).HasColumnName("scores").HasColumnType("jsonb").IsRequired();
        b.Property(x => x.Bottleneck).HasColumnName("bottleneck").HasColumnType("jsonb").IsRequired();
        b.Property(x => x.Result).HasColumnName("result").HasColumnType("jsonb").IsRequired();
        b.HasIndex(x => new { x.PlayerId, x.CreatedAt });
    }
}

public interface IAttemptStore
{
    Task AddAsync(AttemptEntity attempt, CancellationToken ct);

    Task<IReadOnlyList<AttemptEntity>> ListAsync(Guid playerId, int limit, CancellationToken ct);

    Task<AttemptEntity?> FindAsync(Guid id, CancellationToken ct);
}

public sealed class DbAttemptStore(AppDbContext db) : IAttemptStore
{
    public async Task AddAsync(AttemptEntity attempt, CancellationToken ct)
    {
        db.Set<AttemptEntity>().Add(attempt);
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<AttemptEntity>> ListAsync(Guid playerId, int limit, CancellationToken ct) =>
        await db.Set<AttemptEntity>().AsNoTracking()
            .Where(x => x.PlayerId == playerId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);

    public Task<AttemptEntity?> FindAsync(Guid id, CancellationToken ct) =>
        db.Set<AttemptEntity>().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
}

/// <summary>Спроби в пам'яті — коли бази немає (тести, запуск без PostgreSQL).</summary>
public sealed class MemoryAttemptStore : IAttemptStore
{
    private readonly ConcurrentDictionary<Guid, AttemptEntity> _items = new();

    public Task AddAsync(AttemptEntity attempt, CancellationToken ct)
    {
        _items[attempt.Id] = attempt;
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<AttemptEntity>> ListAsync(Guid playerId, int limit, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<AttemptEntity>>(_items.Values
            .Where(x => x.PlayerId == playerId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(limit)
            .ToList());

    public Task<AttemptEntity?> FindAsync(Guid id, CancellationToken ct) =>
        Task.FromResult(_items.GetValueOrDefault(id));
}

/// <summary><c>/api/attempts</c> (docs/api.md).</summary>
public static class AttemptEndpoints
{
    public const int ListLimit = 20;

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static IServiceCollection AddAttempts(this IServiceCollection services, bool hasDatabase) =>
        hasDatabase
            ? services.AddScoped<IAttemptStore, DbAttemptStore>()
            : services.AddSingleton<IAttemptStore, MemoryAttemptStore>();

    public static IEndpointRouteBuilder MapAttemptEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/attempts").WithTags("Attempts");

        group.MapPost("/", async Task<Results<Ok<AttemptSummary>, ValidationProblem>> (
                AttemptRequest request, IMissionCatalog catalog, ISpaceWeatherSource weather, IAttemptStore store, TimeProvider clock, CancellationToken ct) =>
            {
                var errors = DesignValidator.Validate(request.Design, catalog, out var mission);
                if (request.PlayerId == Guid.Empty)
                    errors["playerId"] = ["attempt.playerIdRequired"];
                if (errors.Count > 0 || mission is null)
                    return TypedResults.ValidationProblem(errors.ToDictionary(e => e.Key, e => e.Value.ToArray()));

                var result = await SimulateEndpoints.RunAsync(request.Design, mission, request.Seed, weather, ct);
                var entity = new AttemptEntity
                {
                    Id = Guid.NewGuid(),
                    PlayerId = request.PlayerId,
                    CreatedAt = clock.GetUtcNow(),
                    MissionId = mission.Id,
                    Seed = result.Seed,
                    Success = result.Report.Success,
                    Design = JsonSerializer.Serialize(request.Design, Json),
                    Scores = JsonSerializer.Serialize(result.Report.Scores, Json),
                    Bottleneck = JsonSerializer.Serialize(result.Report.Bottleneck, Json),
                    Result = JsonSerializer.Serialize(result, Json),
                };
                await store.AddAsync(entity, ct);
                return TypedResults.Ok(entity.ToSummary());
            })
            .WithName("CreateAttempt");

        group.MapGet("/", async Task<Results<Ok<List<AttemptSummary>>, ValidationProblem>> (Guid? playerId, IAttemptStore store, CancellationToken ct) =>
            {
                if (playerId is null || playerId == Guid.Empty)
                    return TypedResults.ValidationProblem(new Dictionary<string, string[]> { ["playerId"] = ["attempt.playerIdRequired"] });
                var items = await store.ListAsync(playerId.Value, ListLimit, ct);
                return TypedResults.Ok(items.Select(x => x.ToSummary()).ToList());
            })
            .WithName("GetAttempts");

        group.MapGet("/{id:guid}", async Task<Results<Ok<Attempt>, ProblemHttpResult>> (Guid id, IAttemptStore store, CancellationToken ct) =>
                await store.FindAsync(id, ct) is { } attempt
                    ? TypedResults.Ok(attempt.ToAttempt())
                    : TypedResults.Problem(statusCode: StatusCodes.Status404NotFound, title: "attempt.notFound"))
            .WithName("GetAttempt");

        return app;
    }
}
