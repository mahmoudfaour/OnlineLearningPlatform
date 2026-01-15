using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OnlineLearningPlatform.Domain.Models;

public class QuestionBank
{
    [Key]
    public int Id { get; set; }

    [ForeignKey(nameof(User))]
    public int UserId { get; set; }
    public User? User { get; set; }

    [ForeignKey(nameof(Course))]
    public int? CourseId { get; set; }
    public Course? Course { get; set; }

    [ForeignKey(nameof(Lesson))]
    public int? LessonId { get; set; }
    public Lesson? Lesson { get; set; }

    public SourceType SourceType { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Question> Questions { get; set; } = new List<Question>();
}
