using static SpaceGame.Api.Simulation.Physics.Constants;

namespace SpaceGame.Api.Simulation.Physics;

public sealed record StationSite(string Id, double LatitudeDeg, double LongitudeDeg);

public sealed record ContactWindow(string StationId, double StartS, double EndS);

public sealed record StationContacts(string StationId, int ContactsPerDay, double MinutesPerDay);

public sealed record ContactDay(
    IReadOnlyList<StationContacts> Stations,
    IReadOnlyList<ContactWindow> Windows,
    double UnionMinutes,
    double DownlinkBits,
    double MeanContactDistanceKm);

/// <summary>
/// Сеанси зв'язку за одну добу (план 2.5, D79): кругова орбіта в інерціальній системі →
/// поворот Землі → кут місця над станцією; сеанс — коли кут &gt; 10°.
/// Радіолінія (план 2.6, D80): rate(d) = min(R, R·(1000 км/d)²) — ⇒ обернені квадрати
/// (SmallSat SOA 2026, 11.3.1, с. 308; 3.2.1, с. 30).
/// </summary>
public static class Contacts
{
    public const double StepS = 30;

    /// <summary>Швидкість радіолінії на дальності d, кбіт/с.</summary>
    public static double RateKbps(double ratedKbps, double distanceKm) =>
        Math.Min(ratedKbps, ratedKbps * Math.Pow(LinkReferenceKm / Math.Max(distanceKm, 1), 2));

    /// <summary>
    /// Типова доба: апарат стартує з висхідного вузла (Ω = 0, u = 0). Для геостаціонарної
    /// орбіти — над довготою першої станції (гравець ставить апарат над своєю станцією).
    /// </summary>
    public static ContactDay SimulateDay(
        double altitudeKm,
        double inclinationDeg,
        IReadOnlyList<StationSite> stations,
        double ratedKbps,
        double durationS = SecondsPerDay)
    {
        var r = OrbitMath.RadiusKm(altitudeKm);
        var n = OrbitMath.MeanMotionRadS(r);
        var inc = Rad(inclinationDeg);
        var sinMask = Math.Sin(Rad(ElevationMaskDeg));

        // Початковий поворот Землі: для майже геосинхронних орбіт — апарат над першою станцією.
        var theta0 = 0.0;
        var geosync = Math.Abs(n - EarthRotationRadS) / EarthRotationRadS < 0.01;
        if (geosync && stations.Count > 0)
            theta0 = -Rad(stations[0].LongitudeDeg);

        var sites = stations
            .Select(s => (s.Id, Lat: Rad(s.LatitudeDeg), Lon: Rad(s.LongitudeDeg)))
            .ToArray();
        var inView = new bool[sites.Length];
        var windowStart = new double[sites.Length];
        var counts = new int[sites.Length];
        var seconds = new double[sites.Length];
        var windows = new List<ContactWindow>();
        double unionSeconds = 0, bits = 0, distanceSum = 0;
        var distanceSamples = 0;

        for (var t = 0.0; t < durationS; t += StepS)
        {
            var u = n * t;
            var (sx, sy, sz) = (r * Math.Cos(u), r * Math.Sin(u) * Math.Cos(inc), r * Math.Sin(u) * Math.Sin(inc));
            var theta = theta0 + EarthRotationRadS * t;

            var anyVisible = false;
            var bestDistance = double.MaxValue;
            for (var k = 0; k < sites.Length; k++)
            {
                var (_, lat, lon) = sites[k];
                var lonI = lon + theta;
                var (ux, uy, uz) = (Math.Cos(lat) * Math.Cos(lonI), Math.Cos(lat) * Math.Sin(lonI), Math.Sin(lat));
                var (dx, dy, dz) = (sx - EarthRadiusKm * ux, sy - EarthRadiusKm * uy, sz - EarthRadiusKm * uz);
                var d = Math.Sqrt(dx * dx + dy * dy + dz * dz);
                var sinEl = (dx * ux + dy * uy + dz * uz) / d;
                var visible = sinEl > sinMask;

                if (visible)
                {
                    anyVisible = true;
                    bestDistance = Math.Min(bestDistance, d);
                    seconds[k] += StepS;
                    if (!inView[k])
                    {
                        counts[k]++;
                        windowStart[k] = t;
                    }
                }
                else if (inView[k])
                {
                    windows.Add(new ContactWindow(sites[k].Id, windowStart[k], t));
                }

                inView[k] = visible;
            }

            if (anyVisible)
            {
                unionSeconds += StepS;
                bits += RateKbps(ratedKbps, bestDistance) * 1000 * StepS;
                distanceSum += bestDistance;
                distanceSamples++;
            }
        }

        for (var k = 0; k < sites.Length; k++)
            if (inView[k])
                windows.Add(new ContactWindow(sites[k].Id, windowStart[k], durationS));

        var perStation = sites
            .Select((s, k) => new StationContacts(s.Id, counts[k], seconds[k] / 60))
            .ToList();

        return new ContactDay(perStation, windows, unionSeconds / 60, bits,
            distanceSamples == 0 ? 0 : distanceSum / distanceSamples);
    }

    /// <summary>Радіус зони станції на поверхні Землі (кутовий, °) для маски 10° — для карти.</summary>
    public static double VisibilityRadiusDeg(double altitudeKm)
    {
        var el = Rad(ElevationMaskDeg);
        var r = OrbitMath.RadiusKm(altitudeKm);
        var nadirAngle = Math.Asin(EarthRadiusKm / r * Math.Cos(el));
        return Deg(Math.PI / 2 - el - nadirAngle);
    }
}
