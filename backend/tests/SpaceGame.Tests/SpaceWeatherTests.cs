using System.Net;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using SpaceGame.Api.Catalogs;
using SpaceGame.Api.Simulation;
using SpaceGame.Api.SpaceWeather;

namespace SpaceGame.Tests;

/// <summary>Модуль SpaceWeather на записаній відповіді DONKI GST (березень–квітень 2015), без мережі.</summary>
public sealed class SpaceWeatherTests
{
    private static readonly string Recorded = File.ReadAllText(
        Path.Combine(AppContext.BaseDirectory, "Fixtures", "donki-gst-2015-03-01_2015-04-29.json"));

    /// <summary>Seed, для якого період — увесь 2015 рік (2015-01-01 − 2010-01-01 = 1826 діб).</summary>
    private const long Seed2015 = 1826;

    private sealed class RecordedHandler(bool fail = false) : HttpMessageHandler
    {
        public List<string> Requests { get; } = [];

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Requests.Add(request.RequestUri!.Query);
            if (fail)
                throw new HttpRequestException("offline");
            var body = request.RequestUri.Query.Contains("startDate=2015-03-02") ? Recorded : "[]";
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body) });
        }
    }

    private static (DonkiSpaceWeatherSource Source, RecordedHandler Handler) Create(bool fail = false, ISpaceWeatherCache? cache = null)
    {
        var handler = new RecordedHandler(fail);
        var client = new DonkiClient(new HttpClient(handler), new ConfigurationBuilder().Build());
        return (new DonkiSpaceWeatherSource(client, cache ?? new MemorySpaceWeatherCache(), NullLogger<DonkiSpaceWeatherSource>.Instance), handler);
    }

    [Fact]
    public void Parse_TakesPeakKpPerStorm()
    {
        var storms = DonkiClient.Parse(Recorded).ToList();

        Assert.Equal(4, storms.Count);
        var stPatrick = storms[0];
        Assert.Equal("2015-03-17T06:00:00-GST-001", stPatrick.GstId);
        Assert.Equal(8, stPatrick.Kp);
        Assert.Equal(new DateTime(2015, 3, 17, 15, 0, 0, DateTimeKind.Utc), stPatrick.ObservedAt);
    }

    [Fact]
    public void Period_IsTwelveMonthsWithin2010To2025_AndDeterministic()
    {
        Assert.Equal((new DateOnly(2015, 1, 1), new DateOnly(2015, 12, 31)), StormPeriod.ForSeed(Seed2015));
        foreach (var seed in new long[] { 0, 1, -5, 123_456_789, long.MaxValue })
        {
            var (start, end) = StormPeriod.ForSeed(seed);
            Assert.Equal(StormPeriod.ForSeed(seed), (start, end));
            Assert.True(start >= new DateOnly(2010, 1, 1) && end <= new DateOnly(2025, 12, 31), $"{seed}: {start}..{end}");
        }
    }

    [Fact]
    public async Task SameSeed_GivesSameStorms_AndRequestsAreAtMost60Days()
    {
        var (source, handler) = Create();

        var a = await source.GetAsync(Seed2015, 365, CancellationToken.None);
        var b = await source.GetAsync(Seed2015, 365, CancellationToken.None);

        Assert.True(a.Available);
        Assert.Equal(a.Storms, b.Storms);
        Assert.Equal(75, a.Storms[0].Day); // 17.03.2015 − 01.01.2015
        Assert.Equal(7, handler.Requests.Count); // другий виклик — з кешу
        Assert.All(handler.Requests, q =>
        {
            var parts = System.Web.HttpUtility.ParseQueryString(q);
            var days = DateOnly.Parse(parts["endDate"]!).DayNumber - DateOnly.Parse(parts["startDate"]!).DayNumber + 1;
            Assert.InRange(days, 1, DonkiClient.MaxWindowDays);
        });
    }

    [Fact]
    public async Task ShortMission_KeepsOnlyStormsInsideIt()
    {
        var (source, _) = Create();
        var weather = await source.GetAsync(Seed2015, 80, CancellationToken.None);
        Assert.Equal(75, weather.Storms[0].Day);
        Assert.All(weather.Storms, s => Assert.InRange(s.Day, 0, 79));
    }

    [Fact]
    public async Task Offline_WithoutCache_IsUnavailable_AndSimulationStillRuns()
    {
        var (source, _) = Create(fail: true);

        var weather = await source.GetAsync(Seed2015, 365, CancellationToken.None);
        Assert.False(weather.Available);

        var design = new MissionCatalog().Find("sat-orbit")!.Presets[1].Design;
        var result = Simulator.Simulate(design, new MissionCatalog().Find("sat-orbit")!, Seed2015, weather);
        Assert.Equal("spaceWeatherUnavailable", result.Events[0].Type);
    }

    [Fact]
    public async Task Offline_WithCache_UsesCache()
    {
        var cache = new MemorySpaceWeatherCache();
        var (online, _) = Create(cache: cache);
        await online.GetAsync(Seed2015, 365, CancellationToken.None);

        var (offline, _) = Create(fail: true, cache: cache);
        var weather = await offline.GetAsync(Seed2015, 365, CancellationToken.None);

        Assert.True(weather.Available);
        Assert.Equal(4, weather.Storms.Count);
    }
}
