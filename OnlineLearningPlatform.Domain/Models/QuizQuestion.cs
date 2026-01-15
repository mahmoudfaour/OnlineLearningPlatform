using OnlineLearningPlatform.Domain.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OnlineLearningPlatform.Domain.Models;

public class QuizQuestion
{
    [Key]
    public int Id { get; set; }

    [ForeignKey(nameof(Quiz))]
    public int QuizId { get; set; }
    public Quiz? Quiz { get; set; }

    [ForeignKey(nameof(Question))]
    public int QuestionId { get; set; }
    public Question? Question { get; set; }

    public int Points { get; set; }
    public int OrderIndex { get; set; }
}
