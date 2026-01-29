using OnlineLearningPlatform.Domain;
using System.ComponentModel.DataAnnotations;

namespace OnlineLearningPlatform.Application.DTOs.Users;

public class UserCreateDto
{
    [Required, MaxLength(150)]
    public string FullName { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [Required]
    public UserRole Role { get; set; }
}

public class UserReadDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminUserCreateDto
{
    [Required]
    public string FullName { get; set; } = "";

    [Required, EmailAddress]
    public string Email { get; set; } = "";

    [Required]
    public string Password { get; set; } = ""; // plain password from admin

    [Required]
    public UserRole Role { get; set; } // enum: Admin/Instructor/Student
}

public class AdminUserUpdateDto
{
    [Required]
    public string FullName { get; set; } = "";

    [Required, EmailAddress]
    public string Email { get; set; } = "";

    // optional: if empty => keep old password
    public string? Password { get; set; }

    [Required]
    public UserRole Role { get; set; }
}