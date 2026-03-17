using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SafeSend.Stock.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixSnapshotStockIdType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StockPriceSnapshots",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StockId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Symbol = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    RecordedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockPriceSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StockPriceSnapshots_Stocks_StockId",
                        column: x => x.StockId,
                        principalTable: "Stocks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StockPriceSnapshots_StockId",
                table: "StockPriceSnapshots",
                column: "StockId");

            migrationBuilder.CreateIndex(
                name: "IX_StockPriceSnapshots_Symbol_RecordedAtUtc",
                table: "StockPriceSnapshots",
                columns: new[] { "Symbol", "RecordedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StockPriceSnapshots");
        }
    }
}
