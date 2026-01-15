using OnlineLearningPlatform.Domain;
using System.ComponentModel.DataAnnotations;

namespace OnlineLearningPlatform.Application.DTOs.Lessons;

public class LessonCreateDto
{
    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public LessonType LessonType { get; set; }

    public string? ContentText { get; set; }
    public string? VideoUrl { get; set; }

    [Required]
    public int OrderIndex { get; set; }
}

public class LessonReadDto
{
    public int Id { get; set; }
    public int CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public LessonType LessonType { get; set; }
    public string? ContentText { get; set; }
    public string? VideoUrl { get; set; }
    public int OrderIndex { get; set; }
}
