using OnlineLearningPlatform.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OnlineLearningPlatform.Domain;

public class Lesson
{
    [Key]
    public int Id { get; set; }

    [ForeignKey(nameof(Course))]
    public int CourseId { get; set; }
    public Course? Course { get; set; }

    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public LessonType LessonType { get; set; }

    public string? ContentText { get; set; }
    public string? VideoUrl { get; set; }

    public int OrderIndex { get; set; }

    public ICollection<LessonAttachment> LessonAttachments { get; set; } = new List<LessonAttachment>();
    public ICollection<LessonCompletion> LessonCompletions { get; set; } = new List<LessonCompletion>();
}
