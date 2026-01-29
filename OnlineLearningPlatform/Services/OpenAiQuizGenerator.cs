using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OnlineLearningPlatform.Application.Services.AiQuiz;
using OpenAI.Chat;
using System.ClientModel;

namespace OnlineLearningPlatform.API.Services
{
    public sealed class OpenAiQuizGenerator : IAiQuizGenerator
    {
        private readonly ChatClient _chat;
        private readonly ILogger<OpenAiQuizGenerator> _logger;

        // You can change model here
        private const string ModelName = "gpt-4o-mini";

        // Keep JSON parsing tolerant
        private static readonly JsonSerializerOptions JsonOpts = new()
        {
            PropertyNameCaseInsensitive = true
        };

        public OpenAiQuizGenerator(IConfiguration config, ILogger<OpenAiQuizGenerator> logger)
        {
            _logger = logger;

            var apiKey = config["OPENAI_API_KEY"];
            if (string.IsNullOrWhiteSpace(apiKey))
                throw new InvalidOperationException("Missing OPENAI_API_KEY in configuration/environment variables.");

            _chat = new ChatClient(model: ModelName, apiKey: apiKey);
        }

        // Your interface doesn’t have CancellationToken, so we keep the signature.
        public async Task<List<GeneratedQuestion>> GenerateMcqAsync(string lessonText, int count)
        {
            if (string.IsNullOrWhiteSpace(lessonText))
                throw new ArgumentException("lessonText is empty.", nameof(lessonText));

            count = Clamp(count, 1, 20);

            lessonText = lessonText.Trim();
            if (lessonText.Length > 8000) lessonText = lessonText[..8000];

            var baseMessages = new List<ChatMessage>
            {
                new SystemChatMessage(
                    "You are an expert instructor assistant.\n" +
                    "Generate high-quality MCQs.\n" +
                    "Return ONLY valid JSON (no markdown, no code fences, no extra text)."
                ),
                new UserChatMessage(BuildPrompt(lessonText, count))
            };

            // 1) First attempt
            var raw = await CallOpenAiAndGetTextAsync(baseMessages);

            var items = ParseJson(raw);

            // 2) If invalid format/content -> one fix attempt
            if (!ValidateAndFix(items, count))
            {
                _logger.LogWarning("AI output failed validation. Retrying with fix prompt...");

                var fixMessages = new List<ChatMessage>
                {
                    new SystemChatMessage("Return ONLY valid JSON. No markdown. No extra text."),
                    new UserChatMessage(BuildFixPrompt(lessonText, count, raw))
                };

                var retryRaw = await CallOpenAiAndGetTextAsync(fixMessages);

                items = ParseJson(retryRaw);

                if (!ValidateAndFix(items, count))
                    throw new Exception("AI output invalid after retry.\nRaw:\n" + retryRaw);
            }

            return items;
        }

        // -----------------------------
        // OpenAI call + error handling
        // -----------------------------
        private async Task<string> CallOpenAiAndGetTextAsync(List<ChatMessage> messages)
        {
            try
            {
                // returns ClientResult<ChatCompletion>
                var completion = await _chat.CompleteChatAsync(messages);

                var raw = completion.Value?.Content?.FirstOrDefault()?.Text?.Trim();
                if (string.IsNullOrWhiteSpace(raw))
                    throw new Exception("AI returned empty output.");

                return raw;
            }
            catch (ClientResultException ex) when (ex.Status == 429)
            {
                // This is your screenshot error: insufficient_quota
                _logger.LogError(ex, "OpenAI quota/rate-limit error (HTTP 429).");
                throw new Exception(
                    "OpenAI request failed (HTTP 429). This usually means RATE LIMIT or INSUFFICIENT QUOTA. " +
                    "Check your OpenAI billing/limits for the API key.",
                    ex
                );
            }
            catch (ClientResultException ex)
            {
                _logger.LogError(ex, "OpenAI request failed (HTTP {Status}).", ex.Status);
                throw new Exception($"OpenAI request failed (HTTP {ex.Status}).", ex);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while calling OpenAI.");
                throw;
            }
        }

        // -----------------------------
        // Prompt builders
        // -----------------------------
        private static string BuildPrompt(string lessonText, int count)
        {
            return
                $"Create exactly {count} MCQs.\n\n" +
                "Rules:\n" +
                "- Output ONLY valid JSON (no markdown, no code fences).\n" +
                "- Each question has exactly 4 options.\n" +
                "- Exactly 1 correct option (isCorrect=true).\n" +
                "- Provide a short explanation.\n" +
                "- Keep questions clear and not ambiguous.\n\n" +
                "Output JSON format exactly:\n" +
                "[\n" +
                "  {\n" +
                "    \"questionText\": \"...\",\n" +
                "    \"explanation\": \"...\",\n" +
                "    \"options\": [\n" +
                "      { \"answerText\": \"...\", \"isCorrect\": true },\n" +
                "      { \"answerText\": \"...\", \"isCorrect\": false },\n" +
                "      { \"answerText\": \"...\", \"isCorrect\": false },\n" +
                "      { \"answerText\": \"...\", \"isCorrect\": false }\n" +
                "    ]\n" +
                "  }\n" +
                "]\n\n" +
                "Lesson input:\n" +
                lessonText;
        }

        private static string BuildFixPrompt(string lessonText, int count, string badOutput)
        {
            // Keep it strict + short
            return
                $"Fix the output and return ONLY valid JSON.\n" +
                $"You must output exactly {count} MCQs.\n" +
                "Each MCQ must have 4 options and exactly 1 correct.\n\n" +
                "JSON schema:\n" +
                "[{ \"questionText\":\"...\", \"explanation\":\"...\", \"options\":[{ \"answerText\":\"...\", \"isCorrect\":true }]}]\n\n" +
                "Lesson:\n" + lessonText + "\n\n" +
                "Bad output:\n" + badOutput + "\n\n" +
                "Return ONLY corrected JSON.";
        }

        // -----------------------------
        // JSON parsing + validation
        // -----------------------------
        private static List<GeneratedQuestion> ParseJson(string raw)
        {
            try
            {
                // If model accidentally returns leading text, try to cut to first '['
                raw = TryTrimToJsonArray(raw);

                var items = JsonSerializer.Deserialize<List<GeneratedQuestion>>(raw, JsonOpts);
                return items ?? throw new Exception("Deserialized list is null.");
            }
            catch (Exception ex)
            {
                throw new Exception("Failed to parse AI JSON output: " + ex.Message + "\nRaw:\n" + raw);
            }
        }

        private static string TryTrimToJsonArray(string raw)
        {
            raw = raw.Trim();

            var firstBracket = raw.IndexOf('[');
            if (firstBracket > 0)
                raw = raw.Substring(firstBracket);

            // optional: also trim after last ']'
            var lastBracket = raw.LastIndexOf(']');
            if (lastBracket >= 0 && lastBracket < raw.Length - 1)
                raw = raw.Substring(0, lastBracket + 1);

            return raw.Trim();
        }

        private static bool ValidateAndFix(List<GeneratedQuestion> items, int expectedCount)
        {
            if (items == null) return false;
            if (items.Count != expectedCount) return false;

            foreach (var q in items)
            {
                if (q == null || string.IsNullOrWhiteSpace(q.QuestionText)) return false;

                q.Explanation ??= "";

                q.Options ??= new List<GeneratedOption>();
                if (q.Options.Count != 4) return false;

                if (q.Options.Any(o => o == null || string.IsNullOrWhiteSpace(o.AnswerText)))
                    return false;

                // enforce exactly 1 correct
                var correctCount = q.Options.Count(o => o.IsCorrect);

                if (correctCount == 0)
                {
                    q.Options[0].IsCorrect = true;
                }
                else if (correctCount > 1)
                {
                    // keep first correct only
                    bool kept = false;
                    foreach (var o in q.Options)
                    {
                        if (o.IsCorrect && !kept) { kept = true; continue; }
                        o.IsCorrect = false;
                    }
                }

                if (q.Options.Count(o => o.IsCorrect) != 1) return false;
            }

            return true;
        }

        private static int Clamp(int v, int min, int max)
            => v < min ? min : (v > max ? max : v);
    }
}
