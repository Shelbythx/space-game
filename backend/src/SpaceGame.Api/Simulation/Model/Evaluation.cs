using SpaceGame.Api.Catalogs;

namespace SpaceGame.Api.Simulation.Model;

// Відповідь POST /api/evaluate (docs/api.md, docs/openapi.yaml «Evaluation»).

/// <summary>Параметри повідомлення: сирі числа без одиниць або рядки (docs/api.md, «Коди повідомлень»).</summary>
public sealed class Params : Dictionary<string, object>
{
    public Params() : base(StringComparer.Ordinal) { }
}

public sealed record Message(string Code, Params Params)
{
    public static Message Of(string code, Params? p = null) => new(code, p ?? new Params());
}

public sealed record Check(string Segment, string Status, string Code, Params Params);

public sealed record RoleComment(string Role, string Severity, Message Message, Message? Advice);

public sealed record OrbitResult(
    double AltitudeKm,
    double InclinationDeg,
    double PeriodMin,
    double SpeedKmS,
    double EclipseFraction,
    double? LifetimeYears,
    double? DisposalYears);

public sealed record MassResource(
    double UsedKg,
    double BusMaxKg,
    double LaunchCapacityKg,
    int SlotsUsed,
    int Slots,
    double ReservePct,
    double ReserveKg,
    double WithReserveKg,
    double RecommendedReservePct);

public sealed record PowerResource(
    double GenerationW,
    double AverageGenerationW,
    double AverageConsumptionW,
    double EclipseNeedWh,
    double BatteryWh);

public sealed record BudgetResource(double UsedK, double LimitK);

public sealed record DataResource(
    double GeneratedGbPerDay,
    double DownlinkGbPerDay,
    double StorageGb,
    double ExpectedTotalGb,
    double GoalGb);

public sealed record CommsResource(double ContactsPerDay, double ContactMinutesPerDay);

public sealed record TimeResource(int ReadyMonth, int LaunchMonth, int DeadlineMonth);

public sealed record PropellantResource(double NeededKg, double CapacityKg, double DeltaVms);

public sealed record CargoResource(double LoadedKg, double ScienceKg, double SciencePct, double GoalKg, double ScienceMinPct);

public sealed record Resources(
    MassResource Mass,
    PowerResource Power,
    BudgetResource Budget,
    DataResource? Data,
    CommsResource Comms,
    TimeResource Time,
    PropellantResource Propellant,
    CargoResource? Cargo);

public sealed record RendezvousEstimate(double HohmannDeltaVms, double PhasingDays, double PlaneChangeDeltaVms);

public sealed record CalcValue(string Name, double Value, string Unit);

public sealed record CalcSheet(
    string Code,
    string Resource,
    string Formula,
    IReadOnlyList<CalcValue> Inputs,
    CalcValue Result,
    Message Summary,
    Source Source);

public sealed record StripInterval(double StartMin, double EndMin);

public sealed record StripContact(string StationId, double StartMin, double EndMin);

public sealed record OrbitStrip(double PeriodMin, StripInterval? Eclipse, IReadOnlyList<StripContact> Contacts);

public sealed record Evaluation(
    OrbitResult Orbit,
    Resources Resources,
    RendezvousEstimate? Rendezvous,
    IReadOnlyDictionary<string, string> Layout,
    OrbitStrip OrbitStrip,
    IReadOnlyList<CalcSheet> Calc,
    IReadOnlyList<Check> Checks,
    IReadOnlyList<RoleComment> Comments);
