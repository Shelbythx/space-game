using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SpaceGame.Api.Simulation;

namespace SpaceGame.Tests;

/// <summary>Сервіс у пам'яті для тестів ендпоінтів; база не потрібна (середовище Testing).</summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        // Без мережі: бурі DONKI в тестах ендпоінтів не запитуються (модуль тестується окремо).
        builder.ConfigureServices(services => services.Replace(ServiceDescriptor.Singleton<ISpaceWeatherSource, NoSpaceWeather>()));
    }
}
