using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpaceGame.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class Attempts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "attempts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    player_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    mission_id = table.Column<string>(type: "text", nullable: false),
                    seed = table.Column<long>(type: "bigint", nullable: false),
                    success = table.Column<bool>(type: "boolean", nullable: false),
                    design = table.Column<string>(type: "jsonb", nullable: false),
                    scores = table.Column<string>(type: "jsonb", nullable: false),
                    bottleneck = table.Column<string>(type: "jsonb", nullable: false),
                    result = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attempts", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_attempts_player_id_created_at",
                table: "attempts",
                columns: new[] { "player_id", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "attempts");
        }
    }
}
