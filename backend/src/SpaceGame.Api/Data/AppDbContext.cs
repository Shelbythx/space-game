using Microsoft.EntityFrameworkCore;

namespace SpaceGame.Api.Data;

/// <summary>
/// Єдина база сервісу (D58). Таблиці додають модулі: Catalogs (003), SpaceWeather (021),
/// References (023), Attempts (006).
/// </summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
