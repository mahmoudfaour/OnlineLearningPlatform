using System.ComponentModel.DataAnnotations;

namespace OnlineLearningPlatform.Application.DTOs.Lessons;

public class LessonCompletionCreateDto
{
    [Required] public int LessonId { get; set; }
    [Required] public int UserId { get; set; }
}

public class LessonCompletionReadDto
{
    public int Id { get; set; }
    public int LessonId { get; set; }
    public int UserId { get; set; }
    public DateTime CompletedAt { get; set; }
}
