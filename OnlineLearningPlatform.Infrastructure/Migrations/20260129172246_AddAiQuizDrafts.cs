using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineLearningPlatform.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAiQuizDrafts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AiQuizDrafts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CourseId = table.Column<int>(type: "int", nullable: false),
                    LessonId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiQuizDrafts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AiQuizDraftQuestions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DraftId = table.Column<int>(type: "int", nullable: false),
                    QuestionText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    QuestionType = table.Column<int>(type: "int", nullable: false),
                    Explanation = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiQuizDraftQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AiQuizDraftQuestions_AiQuizDrafts_DraftId",
                        column: x => x.DraftId,
                        principalTable: "AiQuizDrafts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AiQuizDraftOptions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DraftQuestionId = table.Column<int>(type: "int", nullable: false),
                    AnswerText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsCorrect = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiQuizDraftOptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AiQuizDraftOptions_AiQuizDraftQuestions_DraftQuestionId",
                        column: x => x.DraftQuestionId,
                        principalTable: "AiQuizDraftQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiQuizDraftOptions_DraftQuestionId",
                table: "AiQuizDraftOptions",
                column: "DraftQuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_AiQuizDraftQuestions_DraftId",
                table: "AiQuizDraftQuestions",
                column: "DraftId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiQuizDraftOptions");

            migrationBuilder.DropTable(
                name: "AiQuizDraftQuestions");

            migrationBuilder.DropTable(
                name: "AiQuizDrafts");
        }
    }
}
