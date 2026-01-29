using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.Domain;
using OnlineLearningPlatform.Domain.Models;
namespace OnlineLearningPlatform.Infrastructure;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<CourseEnrollment> CourseEnrollments => Set<CourseEnrollment>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<LessonAttachment> LessonAttachments => Set<LessonAttachment>();
    public DbSet<LessonCompletion> LessonCompletions => Set<LessonCompletion>();
    public DbSet<Quiz> Quizzes => Set<Quiz>();
    public DbSet<QuestionBank> QuestionBanks => Set<QuestionBank>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<AnswerOption> AnswerOptions => Set<AnswerOption>();
    public DbSet<QuizQuestion> QuizQuestions => Set<QuizQuestion>();
    public DbSet<QuizAttempt> QuizAttempts => Set<QuizAttempt>();
    public DbSet<AttemptAnswer> AttemptAnswers => Set<AttemptAnswer>();
    public DbSet<AttemptAnswerSelection> AttemptAnswerSelections => Set<AttemptAnswerSelection>();
    public DbSet<Certificate> Certificates => Set<Certificate>();


    public DbSet<AiQuizDraft> AiQuizDrafts => Set<AiQuizDraft>();
    public DbSet<AiQuizDraftQuestion> AiQuizDraftQuestions => Set<AiQuizDraftQuestion>();
    public DbSet<AiQuizDraftOption> AiQuizDraftOptions => Set<AiQuizDraftOption>();


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ✅ Unique email
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // ✅ Store enums as strings
        modelBuilder.Entity<User>().Property(x => x.Role).HasConversion<string>();
        modelBuilder.Entity<CourseEnrollment>().Property(x => x.Status).HasConversion<string>();
        modelBuilder.Entity<Lesson>().Property(x => x.LessonType).HasConversion<string>();
        modelBuilder.Entity<QuestionBank>().Property(x => x.SourceType).HasConversion<string>();
        modelBuilder.Entity<Question>().Property(x => x.QuestionType).HasConversion<string>();

        // ---------------------------
        // Courses
        // ---------------------------
        modelBuilder.Entity<Course>()
            .HasOne(c => c.User)
            .WithMany(u => u.Courses)
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // ---------------------------
        // Enrollments
        // ---------------------------
        modelBuilder.Entity<CourseEnrollment>()
            .HasOne(e => e.Course)
            .WithMany(c => c.CourseEnrollments)
            .HasForeignKey(e => e.CourseId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CourseEnrollment>()
            .HasOne(e => e.User)
            .WithMany(u => u.CourseEnrollments)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // ---------------------------
        // Lessons
        // ---------------------------
        modelBuilder.Entity<Lesson>()
            .HasOne(l => l.Course)
            .WithMany(c => c.Lessons)
            .HasForeignKey(l => l.CourseId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LessonAttachment>()
            .HasOne(a => a.Lesson)
            .WithMany(l => l.LessonAttachments)
            .HasForeignKey(a => a.LessonId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LessonCompletion>()
            .HasOne(lc => lc.Lesson)
            .WithMany(l => l.LessonCompletions)
            .HasForeignKey(lc => lc.LessonId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LessonCompletion>()
            .HasOne(lc => lc.User)
            .WithMany()
            .HasForeignKey(lc => lc.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // ---------------------------
        // Quizzes
        // ---------------------------
        modelBuilder.Entity<Quiz>()
            .HasOne(q => q.Course)
            .WithMany(c => c.Quizzes)
            .HasForeignKey(q => q.CourseId)
            .OnDelete(DeleteBehavior.Cascade);

        // ✅ important: avoid multiple cascade paths
        modelBuilder.Entity<Quiz>()
            .HasOne(q => q.Lesson)
            .WithMany()
            .HasForeignKey(q => q.LessonId)
            .OnDelete(DeleteBehavior.Restrict); // or NoAction

        // ---------------------------
        // Question Banks
        // ---------------------------
        modelBuilder.Entity<QuestionBank>()
            .HasOne(qb => qb.User)
            .WithMany(u => u.QuestionBanks)
            .HasForeignKey(qb => qb.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<QuestionBank>()
            .HasOne(qb => qb.Course)
            .WithMany()
            .HasForeignKey(qb => qb.CourseId)
            .OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<QuestionBank>()
            .HasOne(qb => qb.Lesson)
            .WithMany()
            .HasForeignKey(qb => qb.LessonId)
            .OnDelete(DeleteBehavior.Restrict); // or NoAction


        // ---------------------------
        // Questions + Options
        // ---------------------------
        modelBuilder.Entity<Question>()
            .HasOne(q => q.QuestionBank)
            .WithMany(qb => qb.Questions)
            .HasForeignKey(q => q.QuestionBankId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AnswerOption>()
            .HasOne(a => a.Question)
            .WithMany(q => q.AnswerOptions)
            .HasForeignKey(a => a.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        // ---------------------------
        // QuizQuestions (bridge)
        // ---------------------------
        modelBuilder.Entity<QuizQuestion>()
            .HasOne(qq => qq.Quiz)
            .WithMany(q => q.QuizQuestions)
            .HasForeignKey(qq => qq.QuizId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<QuizQuestion>()
            .HasOne(qq => qq.Question)
            .WithMany()
            .HasForeignKey(qq => qq.QuestionId)
            .OnDelete(DeleteBehavior.Restrict);

        // ---------------------------
        // QuizAttempts
        // ---------------------------
        modelBuilder.Entity<QuizAttempt>()
            .HasOne(a => a.Quiz)
            .WithMany(q => q.QuizAttempts)
            .HasForeignKey(a => a.QuizId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<QuizAttempt>()
            .HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // ---------------------------
        // AttemptAnswers (FIXED)
        // ---------------------------
        // ✅ important: avoid multiple cascade paths
        modelBuilder.Entity<AttemptAnswer>()
            .HasOne(aa => aa.QuizAttempt)
            .WithMany(a => a.AttemptAnswers)
            .HasForeignKey(aa => aa.AttemptId)
            .OnDelete(DeleteBehavior.Restrict); // or NoAction

        modelBuilder.Entity<AttemptAnswer>()
            .HasOne(aa => aa.Question)
            .WithMany()
            .HasForeignKey(aa => aa.QuestionId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AttemptAnswer>()
            .HasOne(aa => aa.SelectedAnswerOption)
            .WithMany()
            .HasForeignKey(aa => aa.SelectedAnswerOptionId)
            .OnDelete(DeleteBehavior.SetNull);

        // ---------------------------
        // AttemptAnswerSelections (MSQ)
        // ---------------------------
        modelBuilder.Entity<AttemptAnswerSelection>()
            .HasOne(s => s.AttemptAnswer)
            .WithMany(a => a.AttemptAnswerSelections)
            .HasForeignKey(s => s.AttemptAnswerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AttemptAnswerSelection>()
            .HasOne(s => s.AnswerOption)
            .WithMany()
            .HasForeignKey(s => s.AnswerOptionId)
            .OnDelete(DeleteBehavior.Restrict);

        // ---------------------------
        // Certificates
        // ---------------------------
        modelBuilder.Entity<Certificate>()
            .HasOne(c => c.Course)
            .WithMany()
            .HasForeignKey(c => c.CourseId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Certificate>()
            .HasOne(c => c.User)
            .WithMany()
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);



        //drafts used for ai temporary savings
        modelBuilder.Entity<AiQuizDraft>()
    .HasMany(d => d.Questions)
    .WithOne(q => q.Draft)
    .HasForeignKey(q => q.DraftId)
    .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AiQuizDraftQuestion>()
            .HasMany(q => q.Options)
            .WithOne(o => o.DraftQuestion)
            .HasForeignKey(o => o.DraftQuestionId)
            .OnDelete(DeleteBehavior.Cascade);

    }
}
