using System.ComponentModel.DataAnnotations;

namespace OnlineLearningPlatform.Application.DTOs.Courses;

public class CourseCreateDto
{
    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required]
    public int UserId { get; set; } // instructor/admin who created the course
}

public class CourseReadDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int UserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsPublished { get; set; }
}
