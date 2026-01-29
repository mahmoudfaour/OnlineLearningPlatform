using OnlineLearningPlatform.Domain;
using OnlineLearningPlatform.Domain.Models;

namespace OnlineLearningPlatform.Application.DTOs.AiQuiz;

// =========================
// READ DTOs
// =========================
public class AiQuizDraftReadDto
{
    public int Id { get; set; }
    public int CourseId { get; set; }
    public int LessonId { get; set; }
    public int UserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<AiQuizDraftQuestionReadDto> Questions { get; set; } = new();
}

public class AiQuizDraftQuestionReadDto
{
    public int Id { get; set; }
    public string QuestionText { get; set; } = string.Empty;
    public QuestionType QuestionType { get; set; }
    public string? Explanation { get; set; }
    public List<AiQuizDraftOptionReadDto> Options { get; set; } = new();
}

public class AiQuizDraftOptionReadDto
{
    public int Id { get; set; }
    public string AnswerText { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
}

// =========================
// UPDATE DTOs
// =========================
public class AiQuizDraftUpdateDto
{
    public int Id { get; set; }
    public List<AiQuizDraftQuestionUpdateDto> Questions { get; set; } = new();
}

public class AiQuizDraftQuestionUpdateDto
{
    public int Id { get; set; } // 0 => new question
    public string QuestionText { get; set; } = string.Empty;
    public QuestionType QuestionType { get; set; } = QuestionType.MCQ;
    public string? Explanation { get; set; }
    public List<AiQuizDraftOptionUpdateDto> Options { get; set; } = new();
}

public class AiQuizDraftOptionUpdateDto
{
    public int Id { get; set; } // 0 => new option
    public string AnswerText { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
}

// =========================
// APPROVE RESULT DTO
// =========================
public class AiQuizApproveResultDto
{
    public int QuestionBankId { get; set; }
    public int CreatedQuestionsCount { get; set; }
    public List<int> CreatedQuestionIds { get; set; } = new();
}

public class AiQuizGenerateRequestDto
{
    public string? ExtraInfo { get; set; } // instructor notes / instructions
}
