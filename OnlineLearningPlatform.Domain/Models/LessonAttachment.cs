using OnlineLearningPlatform.Domain.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


public class LessonAttachment
{
    [Key]
    public int Id { get; set; }

    [ForeignKey(nameof(Lesson))]
    public int LessonId { get; set; }
    public Lesson? Lesson { get; set; }

    [Required]
    public string FileUrl { get; set; } = string.Empty;

    [Required]
    public string FileType { get; set; } = string.Empty;
}
