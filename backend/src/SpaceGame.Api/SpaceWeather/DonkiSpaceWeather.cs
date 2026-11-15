using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceGame.Api.Data;
using SpaceGame.Api.Simulation;
using SpaceGame.Api.Simulation.Model;

namespace SpaceGame.Api.SpaceWeather;

// Модуль SpaceWeather (задача 021, D83): справжні магнітні бурі NASA DONKI (GST) у польоті.
// Seed → історичний 12-місячний період у межах 2010–2025 → бурі → дні місії (D65).

/// <summary>Буря з DONKI з абсолютною датою — так вона лежить у кеші.</summary>
public sealed record DonkiStorm(string GstId, DateTime ObservedAt, double Kp);

/// <summary>Вибір історичного періоду за seed: 12 місяців, що повністю вміщаються в 2010–2025.</summary>
public static class StormPeriod
{
    public static readonly DateOnly First = new(2010, 1, 1);
    public static readonly DateOnly LastStart = new(2025, 1, 1);

    public static (DateOnly Start, DateOnly End) ForSeed(long seed)
    {
        var span = LastStart.DayNumber - First.DayNumber + 1;
        var offset = (int)(((seed % span) + span) % span);
        var start = First.AddDays(offset);
        return (start, start.AddYears(1).AddDays(-1));
    }

    /// <summary>Бурі → дні місії: день = дата бурі − початок періоду; лише в межах місії.</summary>
    public static IReadOnlyList<Storm> ToMissionDays(IEnumerable<DonkiStorm> storms, DateOnly start, int missionDays) =>
        storms
            .Select(s => new Storm(DateOnly.FromDateTime(s.ObservedAt).DayNumber - start.DayNumber, s.Kp, s.GstId, s.ObservedAt))
            .Where(s => s.Day >= 0 && s.Day < missionDays)
            .OrderBy(s => s.Day)
            .ToList();
}

/// <summary>
/// Клієнт <c>https://api.nasa.gov/DONKI/GST</c>. API приймає вікно не довше 60 днів, тож
/// рік ділиться на шматки. Ключ — змінна <c>NASA_API_KEY</c> (за замовчуванням DEMO_KEY).
/// </summary>
public sealed class DonkiClient(HttpClient http, IConfiguration config)
{
    public const int MaxWindowDays = 60;

    private string ApiKey => config["NASA_API_KEY"] ?? config["Nasa:ApiKey"] ?? "DEMO_KEY";

    public async Task<IReadOnlyList<DonkiStorm>> GetStormsAsync(DateOnly start, DateOnly end, CancellationToken ct)
    {
        var storms = new Dictionary<string, DonkiStorm>(StringComparer.Ordinal);
        for (var from = start; from <= end; from = from.AddDays(MaxWindowDays))
        {
            var to = from.AddDays(MaxWindowDays - 1) > end ? end : from.AddDays(MaxWindowDays - 1);
            var url = $"https://api.nasa.gov/DONKI/GST?startDate={from:yyyy-MM-dd}&endDate={to:yyyy-MM-dd}&api_key={Uri.EscapeDataString(ApiKey)}";
            using var response = await http.GetAsync(url, ct);
            response.EnsureSuccessStatusCode();
            var body = await response.Content.ReadAsStringAsync(ct);
            foreach (var storm in Parse(body))
                storms.TryAdd(storm.GstId, storm);
        }

        return storms.Values.OrderBy(s => s.ObservedAt).ToList();
    }

    /// <summary>Розбір відповіді GST: для кожної бурі — найбільший Kp і час його спостереження.</summary>
    public static IEnumerable<DonkiStorm> Parse(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
            yield break;
        var items = JsonSerializer.Deserialize<List<GstDto>>(json, JsonOptions) ?? [];
        foreach (var gst in items)
        {
            var peak = gst.AllKpIndex?.OrderByDescending(k => k.KpIndex).ThenBy(k => k.ObservedTime, StringComparer.Ordinal).FirstOrDefault();
            if (gst.GstId is null || peak?.ObservedTime is null)
                continue;
            var observed = DateTime.Parse(peak.ObservedTime, CultureInfo.InvariantCulture,
                DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal);
            yield return new DonkiStorm(gst.GstId, observed, peak.KpIndex);
        }
    }

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private sealed record GstDto([property: JsonPropertyName("gstID")] string? GstId, List<KpDto>? AllKpIndex);

    private sealed record KpDto(double KpIndex, string? ObservedTime);
}

// ───────────────────────────── Кеш ─────────────────────────────

public interface ISpaceWeatherCache
{
    Task<IReadOnlyList<DonkiStorm>?> GetAsync(DateOnly start, DateOnly end, CancellationToken ct);

    Task PutAsync(DateOnly start, DateOnly end, IReadOnlyList<DonkiStorm> storms, CancellationToken ct);
}

/// <summary>Рядок таблиці <c>space_weather_cache</c> (план, розділ 6).</summary>
public sealed class SpaceWeatherCacheEntry
{
    public DateOnly PeriodStart { get; set; }
    public DateOnly PeriodEnd { get; set; }
    public string Events { get; set; } = "[]";
    public DateTimeOffset FetchedAt { get; set; }
}

public sealed class SpaceWeatherCacheConfiguration : IEntityTypeConfiguration<SpaceWeatherCacheEntry>
{
    public void Configure(EntityTypeBuilder<SpaceWeatherCacheEntry> b)
    {
        b.ToTable("space_weather_cache");
        b.HasKey(x => new { x.PeriodStart, x.PeriodEnd });
        b.Property(x => x.PeriodStart).HasColumnName("period_start");
        b.Property(x => x.PeriodEnd).HasColumnName("period_end");
        b.Property(x => x.Events).HasColumnName("events").HasColumnType("jsonb").IsRequired();
        b.Property(x => x.FetchedAt).HasColumnName("fetched_at").IsRequired();
    }
}

public sealed class DbSpaceWeatherCache(AppDbContext db) : ISpaceWeatherCache
{
    public async Task<IReadOnlyList<DonkiStorm>?> GetAsync(DateOnly start, DateOnly end, CancellationToken ct)
    {
        var row = await db.Set<SpaceWeatherCacheEntry>().AsNoTracking()
            .FirstOrDefaultAsync(x => x.PeriodStart == start && x.PeriodEnd == end, ct);
        return row is null ? null : JsonSerializer.Deserialize<List<DonkiStorm>>(row.Events);
    }

    public async Task PutAsync(DateOnly start, DateOnly end, IReadOnlyList<DonkiStorm> storms, CancellationToken ct)
    {
        var set = db.Set<SpaceWeatherCacheEntry>();
        var row = await set.FirstOrDefaultAsync(x => x.PeriodStart == start && x.PeriodEnd == end, ct);
        if (row is null)
            set.Add(row = new SpaceWeatherCacheEntry { PeriodStart = start, PeriodEnd = end });
        row.Events = JsonSerializer.Serialize(storms);
        row.FetchedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
    }
}

/// <summary>Кеш у пам'яті — коли бази немає (тести, запуск без PostgreSQL).</summary>
public sealed class MemorySpaceWeatherCache : ISpaceWeatherCache
{
    private readonly System.Collections.Concurrent.ConcurrentDictionary<(DateOnly, DateOnly), IReadOnlyList<DonkiStorm>> _items = new();

    public Task<IReadOnlyList<DonkiStorm>?> GetAsync(DateOnly start, DateOnly end, CancellationToken ct) =>
        Task.FromResult(_items.TryGetValue((start, end), out var v) ? v : null);

    public Task PutAsync(DateOnly start, DateOnly end, IReadOnlyList<DonkiStorm> storms, CancellationToken ct)
    {
        _items[(start, end)] = storms;
        return Task.CompletedTask;
    }
}

// ───────────────────────────── Джерело для Simulation ─────────────────────────────

/// <summary>
/// Публічний інтерфейс модуля для Simulation (D58): бурі за seed. Спершу кеш; немає — DONKI;
/// DONKI недоступний і кешу немає — <c>Available = false</c> (подія spaceWeatherUnavailable),
/// симуляція не падає.
/// </summary>
public sealed class DonkiSpaceWeatherSource(DonkiClient client, ISpaceWeatherCache cache, ILogger<DonkiSpaceWeatherSource> log)
    : ISpaceWeatherSource
{
    public async Task<SpaceWeatherData> GetAsync(long seed, int days, CancellationToken ct)
    {
        var (start, end) = StormPeriod.ForSeed(seed);
        IReadOnlyList<DonkiStorm>? storms = null;
        try
        {
            storms = await cache.GetAsync(start, end, ct);
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Space weather cache read failed");
        }

        if (storms is null)
        {
            try
            {
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
                timeout.CancelAfter(TimeSpan.FromSeconds(15));
                storms = await client.GetStormsAsync(start, end, timeout.Token);
                try
                {
                    await cache.PutAsync(start, end, storms, ct);
                }
                catch (Exception ex)
                {
                    log.LogWarning(ex, "Space weather cache write failed");
                }
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
            {
                log.LogWarning(ex, "DONKI unavailable for {Start}..{End}", start, end);
                return new SpaceWeatherData([], false, start, end);
            }
        }

        return new SpaceWeatherData(StormPeriod.ToMissionDays(storms, start, days), true, start, end);
    }
}

public static class SpaceWeatherModule
{
    public static IServiceCollection AddSpaceWeather(this IServiceCollection services, bool hasDatabase)
    {
        services.AddHttpClient<DonkiClient>(c => c.Timeout = TimeSpan.FromSeconds(10));
        if (hasDatabase)
            services.AddScoped<ISpaceWeatherCache, DbSpaceWeatherCache>();
        else
            services.AddSingleton<ISpaceWeatherCache, MemorySpaceWeatherCache>();
        services.AddScoped<ISpaceWeatherSource, DonkiSpaceWeatherSource>();
        return services;
    }
}
