using Microsoft.EntityFrameworkCore;
using SpaceGame.Api.Advisor;
using SpaceGame.Api.Attempts;
using SpaceGame.Api.Catalogs;
using SpaceGame.Api.Data;
using SpaceGame.Api.Endpoints;
using SpaceGame.Api.Rooms;
using SpaceGame.Api.Simulation;
using SpaceGame.Api.SpaceWeather;

var builder = WebApplication.CreateBuilder(args);

// База: рядок підключення зі змінної середовища ConnectionStrings__Default
// (docker-compose.yml задає її; локально — appsettings.Development.json).
var connectionString = builder.Configuration.GetConnectionString("Default");
builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (!string.IsNullOrWhiteSpace(connectionString))
        options.UseNpgsql(connectionString);
});

builder.Services.AddCatalogs();
var hasDatabase = !string.IsNullOrWhiteSpace(connectionString);
builder.Services.AddSpaceWeather(hasDatabase);
builder.Services.AddAttempts(hasDatabase);
builder.Services.AddRooms();
builder.Services.AddAdvisor(builder.Configuration);
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();

// CORS (docs/api.md): фронтенд Vite на localhost; додаткові адреси — Cors__Origins__0, …
var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
    ?? ["http://localhost:5173"];
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod()));

builder.Services.ConfigureHttpJsonOptions(options =>
{
    // camelCase; null пишеться (контракт вимагає, напр., "epochDate": null), а поля, яких
    // за контрактом немає, позначені [JsonIgnore(WhenWritingNull)] у моделях.
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseCors();

app.MapOpenApi(); // /openapi/v1.json — з нього фронтенд генерує типи (docs/api.md)
app.MapHealthEndpoints();
app.MapMissionEndpoints();
app.MapEvaluateEndpoints();
app.MapSimulateEndpoints();
app.MapAttemptEndpoints();
app.MapRoomEndpoints();
app.MapAdvisorEndpoints();

if (app.Configuration.GetValue("Database:MigrateOnStartup", false) && !string.IsNullOrWhiteSpace(connectionString))
{
    using var scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

app.Run();

/// <summary>Точка входу; публічна, щоб тести могли підняти сервіс через WebApplicationFactory.</summary>
public partial class Program;
