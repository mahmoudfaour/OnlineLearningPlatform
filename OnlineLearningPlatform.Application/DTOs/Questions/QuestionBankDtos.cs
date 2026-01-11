using OnlineLearningPlatform.Models;
using System.ComponentModel.DataAnnotations;

namespace OnlineLearningPlatform.Application.DTOs.Questions;

public class QuestionBankCreateDto
{
    [Required]
    public int UserId { get; set; }

    public int? CourseId { get; set; }
    public int? LessonId { get; set; }

    [Required]
    public SourceType SourceType { get; set; } // Manual / AI
}

public class QuestionBankReadDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int? CourseId { get; set; }
    public int? LessonId { get; set; }
    public SourceType SourceType { get; set; }
    public DateTime CreatedAt { get; set; }
}
