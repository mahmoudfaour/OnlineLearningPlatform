namespace OnlineLearningPlatform.Application.DTOs.Instructor;

public class InstructorDashboardStatsDto
{
    public int CoursesCreated { get; set; }
    public int TotalEnrollments { get; set; }
    public int QuizzesPublished { get; set; }
    public double? AvgQuizScore { get; set; } // null if not available
}
