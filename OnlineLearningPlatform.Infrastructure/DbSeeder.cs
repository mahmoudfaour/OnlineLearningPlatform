using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.Domain;
using OnlineLearningPlatform.Domain.Models;

namespace OnlineLearningPlatform.Infrastructure;

public static class DbSeeder
{
    public static async Task ResetAndSeedAsync(AppDbContext db, Func<string, string> hashPassword)
    {
        await db.Database.MigrateAsync();
        await ClearAllDataAsync(db);

        // =========================
        // 1) Users
        // =========================
        var admin = new User
        {
            FullName = "Admin User",
            Email = "admin@test.com",
            PasswordHash = hashPassword("Admin@123"),
            Role = UserRole.Admin,
            CreatedAt = DateTime.UtcNow
        };

        var instructor = new User
        {
            FullName = "Instructor User",
            Email = "instructor@test.com",
            PasswordHash = hashPassword("Instructor@123"),
            Role = UserRole.Instructor,
            CreatedAt = DateTime.UtcNow
        };

        var student = new User
        {
            FullName = "Student User",
            Email = "student@test.com",
            PasswordHash = hashPassword("Student@123"),
            Role = UserRole.Student,
            CreatedAt = DateTime.UtcNow
        };

        db.Users.AddRange(admin, instructor, student);
        await db.SaveChangesAsync();

        // =========================
        // 2) Courses
        // =========================
        var c1 = new Course
        {
            Title = "Ethics in Life and Pluralism",
            Description = "Introduction to ethics and pluralism in modern society.",
            UserId = instructor.Id,
            CreatedAt = DateTime.UtcNow,
            IsPublished = true
        };

        var c2 = new Course
        {
            Title = "Final Year Project",
            Description = "Milestones, structure, and best practices for graduation projects.",
            UserId = instructor.Id,
            CreatedAt = DateTime.UtcNow,
            IsPublished = true
        };

        var c3 = new Course
        {
            Title = "Engineer Intern",
            Description = "Prepare for internships: CV, interviews, and workplace skills.",
            UserId = instructor.Id,
            CreatedAt = DateTime.UtcNow,
            IsPublished = true
        };

        db.Courses.AddRange(c1, c2, c3);
        await db.SaveChangesAsync();

        // =========================
        // 3) Lessons
        // =========================
        db.Lessons.AddRange(
            // Course 1
            new Lesson { CourseId = c1.Id, Title = "Introduction", LessonType = LessonType.Text, ContentText = "Welcome to the course!", OrderIndex = 1 },
            new Lesson { CourseId = c1.Id, Title = "Core Concepts", LessonType = LessonType.Video, VideoUrl = "https://example.com/video1", OrderIndex = 2 },
            new Lesson { CourseId = c1.Id, Title = "Practice & Reflection", LessonType = LessonType.Text, ContentText = "Practice questions and reflection prompts.", OrderIndex = 3 },

            // Course 2
            new Lesson { CourseId = c2.Id, Title = "Project Overview", LessonType = LessonType.Text, ContentText = "How to structure a final year project.", OrderIndex = 1 },
            new Lesson { CourseId = c2.Id, Title = "Deliverables & Planning", LessonType = LessonType.Video, VideoUrl = "https://example.com/video2", OrderIndex = 2 },
            new Lesson { CourseId = c2.Id, Title = "Submission Checklist", LessonType = LessonType.Text, ContentText = "Checklist for submission and demo.", OrderIndex = 3 },

            // Course 3
            new Lesson { CourseId = c3.Id, Title = "Internship Basics", LessonType = LessonType.Text, ContentText = "What to expect from an internship.", OrderIndex = 1 },
            new Lesson { CourseId = c3.Id, Title = "Interview Preparation", LessonType = LessonType.Video, VideoUrl = "https://example.com/video3", OrderIndex = 2 },
            new Lesson { CourseId = c3.Id, Title = "Workplace Skills", LessonType = LessonType.Text, ContentText = "Communication and professionalism.", OrderIndex = 3 }
        );

        await db.SaveChangesAsync();

        // =========================
        // 4) Enrollments
        // =========================
        db.CourseEnrollments.AddRange(
            new CourseEnrollment { CourseId = c1.Id, UserId = student.Id, EnrolledAt = DateTime.UtcNow, Status = EnrollmentStatus.Active },
            new CourseEnrollment { CourseId = c2.Id, UserId = student.Id, EnrolledAt = DateTime.UtcNow, Status = EnrollmentStatus.Active }
        );

        await db.SaveChangesAsync();

        // =========================
        // 5) QuestionBanks (NO QuestionBankSourceType enum)
        // =========================
        var qb1 = new QuestionBank
        {
            UserId = instructor.Id,
            CourseId = c1.Id,
            LessonId = null,
            CreatedAt = DateTime.UtcNow
        };

        var qb2 = new QuestionBank
        {
            UserId = instructor.Id,
            CourseId = c2.Id,
            LessonId = null,
            CreatedAt = DateTime.UtcNow
        };

        // If your QuestionBank has string SourceType, set it safely using reflection
        TrySetProperty(qb1, "SourceType", "Course");
        TrySetProperty(qb2, "SourceType", "Course");

        db.QuestionBanks.AddRange(qb1, qb2);
        await db.SaveChangesAsync();

        // =========================
        // 6) Questions + AnswerOptions
        // =========================
        var q1 = new Question { QuestionBankId = qb1.Id, QuestionText = "Pluralism means…", QuestionType = QuestionType.MCQ, Explanation = "Multiple perspectives can coexist." };
        var q2 = new Question { QuestionBankId = qb1.Id, QuestionText = "Ethics is mainly about…", QuestionType = QuestionType.MCQ, Explanation = "Moral principles." };
        var q3 = new Question { QuestionBankId = qb1.Id, QuestionText = "Good ethical decisions consider…", QuestionType = QuestionType.MCQ, Explanation = "Impact on others." };

        var q4 = new Question { QuestionBankId = qb2.Id, QuestionText = "A good FYP objective should be…", QuestionType = QuestionType.MCQ, Explanation = "Specific and measurable." };
        var q5 = new Question { QuestionBankId = qb2.Id, QuestionText = "A project plan should include…", QuestionType = QuestionType.MCQ, Explanation = "Milestones and timeline." };
        var q6 = new Question { QuestionBankId = qb2.Id, QuestionText = "Before final submission, you should…", QuestionType = QuestionType.MCQ, Explanation = "Test and validate outputs." };

        db.Questions.AddRange(q1, q2, q3, q4, q5, q6);
        await db.SaveChangesAsync();

        AddMcqOptions(db, q1, 1, "One belief only", "Multiple perspectives coexist", "No opinions allowed", "Only science matters");
        AddMcqOptions(db, q2, 1, "Fashion", "Moral principles", "Sports rules", "Weather");
        AddMcqOptions(db, q3, 0, "Impact on others", "Only money", "Only speed", "Only traditions");

        AddMcqOptions(db, q4, 0, "Specific & measurable", "Random", "Very vague", "No constraints");
        AddMcqOptions(db, q5, 2, "Only budget", "Only team names", "Milestones & timeline", "Only colors");
        AddMcqOptions(db, q6, 1, "Ignore testing", "Test and validate", "Submit immediately", "Copy from others");

        await db.SaveChangesAsync();

        // =========================
        // 7) Final Quizzes (IsFinal = true)
        // =========================
        var finalQuizC1 = new Quiz
        {
            CourseId = c1.Id,
            LessonId = null,
            Title = "Final Quiz — Ethics & Pluralism",
            PassingScorePercent = 60,
            TimeLimitSeconds = 600,
            CreatedAt = DateTime.UtcNow,
            IsFinal = true
        };

        var finalQuizC2 = new Quiz
        {
            CourseId = c2.Id,
            LessonId = null,
            Title = "Final Quiz — Final Year Project",
            PassingScorePercent = 60,
            TimeLimitSeconds = 600,
            CreatedAt = DateTime.UtcNow,
            IsFinal = true
        };

        db.Quizzes.AddRange(finalQuizC1, finalQuizC2);
        await db.SaveChangesAsync();

        // =========================
        // 8) Attach questions to final quizzes
        // =========================
        db.QuizQuestions.AddRange(
            new QuizQuestion { QuizId = finalQuizC1.Id, QuestionId = q1.Id, Points = 10, OrderIndex = 1 },
            new QuizQuestion { QuizId = finalQuizC1.Id, QuestionId = q2.Id, Points = 10, OrderIndex = 2 },
            new QuizQuestion { QuizId = finalQuizC1.Id, QuestionId = q3.Id, Points = 10, OrderIndex = 3 },

            new QuizQuestion { QuizId = finalQuizC2.Id, QuestionId = q4.Id, Points = 10, OrderIndex = 1 },
            new QuizQuestion { QuizId = finalQuizC2.Id, QuestionId = q5.Id, Points = 10, OrderIndex = 2 },
            new QuizQuestion { QuizId = finalQuizC2.Id, QuestionId = q6.Id, Points = 10, OrderIndex = 3 }
        );

        await db.SaveChangesAsync();
    }

    private static void AddMcqOptions(AppDbContext db, Question question, int correctIndex, params string[] options)
    {
        for (int i = 0; i < options.Length; i++)
        {
            db.AnswerOptions.Add(new AnswerOption
            {
                QuestionId = question.Id,
                AnswerText = options[i],
                IsCorrect = (i == correctIndex)
            });
        }
    }

    // Sets a property if it exists (avoids compile-time dependency on enum types)
    private static void TrySetProperty(object target, string propName, object value)
    {
        var prop = target.GetType().GetProperty(propName);
        if (prop == null || !prop.CanWrite) return;

        // If property is string
        if (prop.PropertyType == typeof(string))
        {
            prop.SetValue(target, value?.ToString());
            return;
        }

        // If property is enum (try parse by name)
        if (prop.PropertyType.IsEnum)
        {
            try
            {
                var parsed = Enum.Parse(prop.PropertyType, value.ToString()!, ignoreCase: true);
                prop.SetValue(target, parsed);
            }
            catch
            {
                // ignore if can't parse
            }
        }
    }

    private static async Task ClearAllDataAsync(AppDbContext db)
    {
        db.AttemptAnswerSelections.RemoveRange(db.AttemptAnswerSelections);
        db.AttemptAnswers.RemoveRange(db.AttemptAnswers);
        db.QuizQuestions.RemoveRange(db.QuizQuestions);
        db.AnswerOptions.RemoveRange(db.AnswerOptions);
        db.QuizAttempts.RemoveRange(db.QuizAttempts);
        db.Questions.RemoveRange(db.Questions);
        db.Quizzes.RemoveRange(db.Quizzes);
        db.QuestionBanks.RemoveRange(db.QuestionBanks);

        db.LessonAttachments.RemoveRange(db.LessonAttachments);
        db.LessonCompletions.RemoveRange(db.LessonCompletions);
        db.Lessons.RemoveRange(db.Lessons);

        db.Certificates.RemoveRange(db.Certificates);
        db.CourseEnrollments.RemoveRange(db.CourseEnrollments);
        db.Courses.RemoveRange(db.Courses);

        db.Users.RemoveRange(db.Users);

        await db.SaveChangesAsync();
    }
}
