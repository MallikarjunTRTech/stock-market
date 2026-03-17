using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SafeSend.Stock.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAvailableStocksToStock : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AvailableStocks",
                table: "Stocks",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AvailableStocks",
                table: "Stocks");
        }
    }
}
