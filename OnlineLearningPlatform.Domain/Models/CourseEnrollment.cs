using OnlineLearningPlatform.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OnlineLearningPlatform.Domain;

public class CourseEnrollment
{
    [Key]
    public int Id { get; set; }

    [ForeignKey(nameof(Course))]
    public int CourseId { get; set; }
    public Course? Course { get; set; }

    [ForeignKey(nameof(User))]
    public int UserId { get; set; }
    public User? User { get; set; }

    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
    public EnrollmentStatus Status { get; set; }
}
