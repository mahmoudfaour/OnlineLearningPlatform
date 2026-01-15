using OnlineLearningPlatform.Domain.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OnlineLearningPlatform.Domain.Models;

public class Quiz
{
    [Key]
    public int Id { get; set; }

    [ForeignKey(nameof(Course))]
    public int CourseId { get; set; }
    public Course? Course { get; set; }

    [ForeignKey(nameof(Lesson))]
    public int? LessonId { get; set; }
    public Lesson? Lesson { get; set; }

    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public int PassingScorePercent { get; set; }
    public int TimeLimitSeconds { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<QuizQuestion> QuizQuestions { get; set; } = new List<QuizQuestion>();
    public ICollection<QuizAttempt> QuizAttempts { get; set; } = new List<QuizAttempt>();
}
