using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OnlineLearningPlatform.Domain;

public class AttemptAnswerSelection
{
    [Key]
    public int Id { get; set; }

    [ForeignKey(nameof(AttemptAnswer))]
    public int AttemptAnswerId { get; set; }
    public AttemptAnswer? AttemptAnswer { get; set; }

    [ForeignKey(nameof(AnswerOption))]
    public int AnswerOptionId { get; set; }
    public AnswerOption? AnswerOption { get; set; }
}
