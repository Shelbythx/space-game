using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpaceGame.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class SpaceWeatherCache : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "space_weather_cache",
                columns: table => new
                {
                    period_start = table.Column<DateOnly>(type: "date", nullable: false),
                    period_end = table.Column<DateOnly>(type: "date", nullable: false),
                    events = table.Column<string>(type: "jsonb", nullable: false),
                    fetched_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_space_weather_cache", x => new { x.period_start, x.period_end });
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "space_weather_cache");
        }
    }
}
