using SpaceGame.Api.Simulation.Model;

namespace SpaceGame.Api.Advisor;

/// <summary>
/// Демо-наставник (D111): без мовної моделі складає відповідь із кодів, які гра вже має —
/// перевірки, коментарі й поради ролей, підсумки розрахункових листів, ланцюжки звіту. Фронтенд
/// перекладає їх тими самими рядками i18n, тож числа й джерела — з розрахунку гри (D51).
/// </summary>
public static class DemoAdvisor
{
    public const int MaxMessages = 8;

    /// <summary>Основи слів у питанні → ресурс (укр. та англ.; без закінчень).</summary>
    private static readonly (string Resource, string[] Stems)[] QuestionStems =
    [
        ("power", ["енерг", "батар", "акумул", "панел", "сонячн", "живлен", "тін", "power", "batter", "solar", "energy", "eclipse"]),
        ("propellant", ["палив", "двигун", "сходж", "відвед", "propell", "fuel", "engine", "thrust", "deorbit", "disposal"]),
        ("budget", ["бюджет", "грош", "кошт", "ціна", "ціни", "дорог", "дешев", "budget", "cost", "price", "money", "cheap", "expens"]),
        ("comms", ["зв'яз", "зв’яз", "станц", "радіо", "антен", "сеанс", "ретранс", "comm", "station", "radio", "antenna", "contact", "downlink", "relay"]),
        ("data", ["дан", "інструмент", "камер", "пам'ят", "пам’ят", "наук", "data", "instrument", "camera", "storage", "science"]),
        ("mass", ["мас", "ваг", "важк", "корпус", "mass", "weigh", "heavy", "bus"]),
        ("time", ["час", "строк", "дедлайн", "місяц", "запіз", "time", "deadline", "month", "schedul", "late"]),
    ];

    /// <summary>Фрагменти кодів перевірок і коментарів → ресурс.</summary>
    private static readonly (string Resource, string[] Parts)[] CodeParts =
    [
        ("power", ["power", "battery", "eclipse", "solar", "panel"]),
        ("propellant", ["propellant", "disposal", "deorbit", "decay", "engine", "fuel"]),
        ("budget", ["budget", "cost", "price"]),
        ("comms", ["contact", "downlink", "station", "comms", "relay", "radio"]),
        ("data", ["data", "storage", "goal", "instrument", "science", "camera"]),
        ("mass", ["mass", "capacity", "slots", "bus", "fairing", "reserve", "cargo"]),
        ("time", ["deadline", "late", "time", "schedule", "month"]),
    ];

    public static string? ResourceOfQuestion(string question)
    {
        var q = question.ToLowerInvariant();
        foreach (var (resource, stems) in QuestionStems)
            if (stems.Any(q.Contains))
                return resource;
        return null;
    }

    public static string? ResourceOfCode(string code)
    {
        var c = code.ToLowerInvariant();
        foreach (var (resource, parts) in CodeParts)
            if (parts.Any(c.Contains))
                return resource;
        return null;
    }

    private static int Weight(string status) => status switch { "fail" => 0, "warn" => 1, _ => 2 };

    public static AdvisorAnswer Ask(Evaluation evaluation, string question)
    {
        var focus = ResourceOfQuestion(question);
        var messages = new List<Message>();
        var problems = evaluation.Checks.Where(c => c.Status != "ok").OrderBy(c => Weight(c.Status)).ToList();

        if (focus is not null)
        {
            messages.Add(Message.Of($"advisor.demo.focus.{focus}"));
            var checks = evaluation.Checks.Where(c => ResourceOfCode(c.Code) == focus).OrderBy(c => Weight(c.Status)).Take(2);
            messages.AddRange(checks.Select(c => new Message(c.Code, c.Params)));
            foreach (var comment in evaluation.Comments.Where(c => ResourceOfCode(c.Message.Code) == focus).Take(2))
            {
                messages.Add(comment.Message);
                if (comment.Advice is not null)
                    messages.Add(comment.Advice);
            }
            var calcResource = focus == "propellant" ? "propellant" : focus;
            messages.AddRange(evaluation.Calc.Where(s => s.Resource == calcResource).Take(2).Select(s => s.Summary));
            if (messages.Count == 1)
                messages.AddRange(problems.Take(2).Select(c => new Message(c.Code, c.Params)));
        }
        else if (problems.Count == 0)
        {
            messages.Add(Message.Of("advisor.demo.allGood"));
            messages.AddRange(evaluation.Comments.Take(2).Select(c => c.Message));
        }
        else
        {
            messages.Add(Message.Of("advisor.demo.intro"));
            messages.AddRange(problems.Take(4).Select(c => new Message(c.Code, c.Params)));
            messages.AddRange(evaluation.Comments.Where(c => c.Advice is not null).Take(3).Select(c => c.Advice!));
        }

        return AdvisorAnswer.Demo(Distinct(messages));
    }

    public static AdvisorAnswer Report(Report report, Evaluation evaluation)
    {
        var messages = new List<Message>
        {
            Message.Of(report.Success ? "advisor.demo.report.success" : "advisor.demo.report.failure"),
            new(report.Bottleneck.Code, report.Bottleneck.Params),
        };
        // Що зламалось: рішення й наслідок із ланцюжків сегментів, що не пройшли.
        foreach (var segment in report.Segments.Where(s => s.Status != "ok").OrderBy(s => Weight(s.Status)))
        {
            var links = segment.Chain.Where(l => l.Kind is "decision" or "consequence");
            messages.AddRange(links.Select(l => new Message(l.Code, l.Params)));
        }
        messages = Distinct(messages).Take(MaxMessages - 3).ToList();

        var advice = evaluation.Comments.Where(c => c.Advice is not null).Take(2).Select(c => c.Advice!).ToList();
        if (advice.Count > 0)
        {
            messages.Add(Message.Of("advisor.demo.report.next"));
            messages.AddRange(advice);
        }
        return AdvisorAnswer.Demo(Distinct(messages));
    }

    private static List<Message> Distinct(IEnumerable<Message> messages) =>
        messages.DistinctBy(m => m.Code).Take(MaxMessages).ToList();
}
