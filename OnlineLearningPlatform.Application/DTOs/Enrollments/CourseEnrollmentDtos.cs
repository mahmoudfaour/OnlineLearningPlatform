using System.ComponentModel.DataAnnotations;

namespace OnlineLearningPlatform.Application.DTOs.Enrollments;

using OnlineLearningPlatform.Domain;
using System.ComponentModel.DataAnnotations;


public class CourseEnrollmentCreateDto
{
    [Required] public int CourseId { get; set; }
}

public class CourseEnrollmentReadDto
{
    public int Id { get; set; }
    public int CourseId { get; set; }
    public int UserId { get; set; }
    public DateTime EnrolledAt { get; set; }
    public EnrollmentStatus Status { get; set; }
}
