using System.ComponentModel.DataAnnotations;

namespace OnlineLearningPlatform.Domain.Models;

public class AiQuizDraft
{
    [Key]
    public int Id { get; set; }

    public int CourseId { get; set; }
    public int LessonId { get; set; }
    public int UserId { get; set; } // instructor

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<AiQuizDraftQuestion> Questions { get; set; } = new();
}
