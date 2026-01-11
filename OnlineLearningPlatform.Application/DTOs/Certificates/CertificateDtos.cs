using System.ComponentModel.DataAnnotations;

namespace OnlineLearningPlatform.Application.DTOs;

public class GenerateCertificateDto
{
    [Required] public int CourseId { get; set; }
    [Required] public int UserId { get; set; }
}

public class CertificateReadDto
{
    public int Id { get; set; }
    public int CourseId { get; set; }
    public int UserId { get; set; }
    public string CertificateCode { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
}
