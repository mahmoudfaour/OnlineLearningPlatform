using OnlineLearningPlatform.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OnlineLearningPlatform.Domain;

public class AttemptAnswer
{
    [Key]
    public int Id { get; set; }

    [ForeignKey(nameof(QuizAttempt))]
    public int AttemptId { get; set; }
    public QuizAttempt? QuizAttempt { get; set; }

    [ForeignKey(nameof(Question))]
    public int QuestionId { get; set; }
    public Question? Question { get; set; }

    [ForeignKey(nameof(AnswerOption))]
    public int? SelectedAnswerOptionId { get; set; }
    public AnswerOption? SelectedAnswerOption { get; set; }

    public string? ShortAnswerText { get; set; }

    public bool IsCorrect { get; set; }
    public int PointsEarned { get; set; }

    public ICollection<AttemptAnswerSelection> AttemptAnswerSelections { get; set; } = new List<AttemptAnswerSelection>();
}
