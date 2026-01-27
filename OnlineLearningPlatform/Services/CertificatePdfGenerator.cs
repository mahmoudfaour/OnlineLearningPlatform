using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace OnlineLearningPlatform.API.Services;

public class CertificatePdfGenerator
{
    // Photoshop raster size (your coordinate system)
    private const float PsWidth = 14617f;
    private const float PsHeight = 10329f;

    // A4 Landscape in PDF points
    private const float PageW = 842f;
    private const float PageH = 595f;

    // Your Photoshop coordinates
    private const float NameX = 6200f, NameY = 4080f;
    private const float CourseX = 5800f, CourseY = 5030f;
    private const float DayX = 4724f, DayY = 6470f;
    private const float MonthX = 7100f, MonthY = 6470f;
    private const float YearX = 10040f, YearY = 6470f;
    private const float CodeX = 8900f, CodeY = 7645f;

    public byte[] Generate(
        string courseTitle,
        string studentName,
        string certificateCode,
        DateTime generatedAtUtc,
        string templatePath)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        if (!File.Exists(templatePath))
            throw new FileNotFoundException("Certificate template not found.", templatePath);

        var svgText = File.ReadAllText(templatePath);

        var localDate = generatedAtUtc.ToLocalTime();
        var day = localDate.Day.ToString();
        var month = localDate.ToString("MMMM");
        var year = localDate.Year.ToString();

        // Convert Photoshop pixels -> PDF points (FitArea-like scaling)
        var scaleX = PageW / PsWidth;
        var scaleY = PageH / PsHeight;
        var scale = Math.Min(scaleX, scaleY);

        float PX(float x) => x * scale;
        float PY(float y) => y * scale;

        var doc = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(0);
                page.PageColor(Colors.White);

                page.Content().Layers(layers =>
                {
                    // ✅ Exactly ONE primary layer
                    layers.PrimaryLayer()
                        .Svg(svgText)
                        .FitArea();

                    // Helper: place text using ONE fluent chain (avoids the single-child error)
                    void PlaceText(float x, float y, Action<TextDescriptor> build)
                    {
                        layers.Layer().Element(el =>
                            el.PaddingLeft(PX(x))
                              .PaddingTop(PY(y))
                              .Text(t => build(t))
                        );
                    }

                    // Student name
                    PlaceText(NameX, NameY, t =>
                    {
                        t.DefaultTextStyle(s => s.FontSize(24).SemiBold().FontColor(Colors.Black));
                        t.Span(studentName);
                    });

                    // Course title
                    PlaceText(CourseX, CourseY, t =>
                    {
                        t.DefaultTextStyle(s => s.FontSize(18).SemiBold().FontColor(Colors.Black));
                        t.Span(courseTitle);
                    });

                    // Day / Month / Year
                    PlaceText(DayX, DayY, t =>
                    {
                        t.DefaultTextStyle(s => s.FontSize(14).FontColor(Colors.Black));
                        t.Span(day);
                    });

                    PlaceText(MonthX, MonthY, t =>
                    {
                        t.DefaultTextStyle(s => s.FontSize(14).FontColor(Colors.Black));
                        t.Span(month);
                    });

                    PlaceText(YearX, YearY, t =>
                    {
                        t.DefaultTextStyle(s => s.FontSize(14).FontColor(Colors.Black));
                        t.Span(year);
                    });

                    // Certificate code
                    PlaceText(CodeX, CodeY, t =>
                    {
                        t.DefaultTextStyle(s => s.FontSize(12).SemiBold().FontColor(Colors.Grey.Darken3));
                        t.Span($"Code: {certificateCode}");
                    });
                });
            });
        });

        return doc.GeneratePdf();
    }
}
