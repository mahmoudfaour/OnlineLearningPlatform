using System.ComponentModel.DataAnnotations;

namespace OnlineLearningPlatform.Application.DTOs.Lessons;

public class LessonAttachmentCreateDto
{
    [Required]
    public string FileUrl { get; set; } = string.Empty;

    [Required]
    public string FileType { get; set; } = string.Empty; // "PDF", "Image", ...
}

public class LessonAttachmentReadDto
{
    public int Id { get; set; }
    public int LessonId { get; set; }
    public string FileUrl { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty;
}
