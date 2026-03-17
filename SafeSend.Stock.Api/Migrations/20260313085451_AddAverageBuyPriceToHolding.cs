using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SafeSend.Stock.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAverageBuyPriceToHolding : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AverageBuyPrice",
                table: "Holdings",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AverageBuyPrice",
                table: "Holdings");
        }
    }
}
