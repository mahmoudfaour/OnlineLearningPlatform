namespace OnlineLearningPlatform.Application.Services.AiQuiz;

public interface IAiQuizGenerator
{
    Task<List<GeneratedQuestion>> GenerateMcqAsync(string lessonText, int count);
}

public class GeneratedQuestion
{
    public string QuestionText { get; set; } = "";
    public string? Explanation { get; set; }
    public List<GeneratedOption> Options { get; set; } = new();
}

public class GeneratedOption
{
    public string AnswerText { get; set; } = "";
    public bool IsCorrect { get; set; }
}
