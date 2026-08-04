from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output" / "pdf" / "student_portal_changes_documentation.pdf"

NAVY = colors.HexColor("#0B1F3A")
BLUE = colors.HexColor("#2563EB")
SKY = colors.HexColor("#EAF2FF")
GOLD = colors.HexColor("#F5B942")
GREEN = colors.HexColor("#16A36A")
YELLOW = colors.HexColor("#E7A818")
RED = colors.HexColor("#DC4C4C")
INK = colors.HexColor("#172033")
MUTED = colors.HexColor("#596780")
LINE = colors.HexColor("#D9E1EC")
PALE = colors.HexColor("#F6F8FB")
WHITE = colors.white


def register_fonts():
    candidates = [
        ("C:/Windows/Fonts/arial.ttf", "Arial"),
        ("C:/Windows/Fonts/arialbd.ttf", "Arial-Bold"),
    ]
    for path, name in candidates:
        if Path(path).exists():
            pdfmetrics.registerFont(TTFont(name, path))


register_fonts()
FONT = "Arial" if "Arial" in pdfmetrics.getRegisteredFontNames() else "Helvetica"
FONT_BOLD = "Arial-Bold" if "Arial-Bold" in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold"


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="DocTitle", fontName=FONT_BOLD, fontSize=28, leading=32,
    textColor=WHITE, alignment=TA_LEFT, spaceAfter=10,
))
styles.add(ParagraphStyle(
    name="CoverSub", fontName=FONT, fontSize=12, leading=18,
    textColor=colors.HexColor("#DCE8FF"), spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="Section", fontName=FONT_BOLD, fontSize=18, leading=22,
    textColor=NAVY, spaceBefore=4, spaceAfter=10,
))
styles.add(ParagraphStyle(
    name="Subsection", fontName=FONT_BOLD, fontSize=12.5, leading=16,
    textColor=BLUE, spaceBefore=8, spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="BodyX", fontName=FONT, fontSize=9.5, leading=14,
    textColor=INK, spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="BodySmall", fontName=FONT, fontSize=8.4, leading=12,
    textColor=INK,
))
styles.add(ParagraphStyle(
    name="BulletX", fontName=FONT, fontSize=9.3, leading=13.5,
    textColor=INK, leftIndent=12, firstLineIndent=-8, spaceAfter=4,
))
styles.add(ParagraphStyle(
    name="Label", fontName=FONT_BOLD, fontSize=8, leading=10,
    textColor=MUTED, uppercase=True,
))
styles.add(ParagraphStyle(
    name="Callout", fontName=FONT, fontSize=9.2, leading=14,
    textColor=NAVY,
))
styles.add(ParagraphStyle(
    name="TableHead", fontName=FONT_BOLD, fontSize=8.2, leading=10,
    textColor=WHITE,
))
styles.add(ParagraphStyle(
    name="TableCell", fontName=FONT, fontSize=7.8, leading=10.5,
    textColor=INK,
))


class StudentPortalDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=19 * mm,
            rightMargin=19 * mm,
            topMargin=19 * mm,
            bottomMargin=17 * mm,
            title="Student Portal Changes Documentation",
            author="TMS Development Team",
            subject="Implemented student portal enhancements",
        )
        frame = Frame(
            self.leftMargin,
            self.bottomMargin,
            self.width,
            self.height,
            id="content",
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
        )
        self.addPageTemplates(PageTemplate(id="main", frames=[frame], onPage=self.decorate_page))

    def decorate_page(self, canvas, doc):
        canvas.saveState()
        if doc.page == 1:
            canvas.setFillColor(NAVY)
            canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
            canvas.setFillColor(BLUE)
            canvas.rect(0, A4[1] - 9 * mm, A4[0], 9 * mm, fill=1, stroke=0)
            canvas.setFillColor(GOLD)
            canvas.rect(0, 0, 8 * mm, A4[1], fill=1, stroke=0)
        else:
            canvas.setStrokeColor(LINE)
            canvas.setLineWidth(0.5)
            canvas.line(19 * mm, A4[1] - 12 * mm, A4[0] - 19 * mm, A4[1] - 12 * mm)
            canvas.setFont(FONT_BOLD, 7.5)
            canvas.setFillColor(NAVY)
            canvas.drawString(19 * mm, A4[1] - 9 * mm, "TMS  /  STUDENT PORTAL")
            canvas.setFont(FONT, 7.5)
            canvas.setFillColor(MUTED)
            canvas.drawRightString(A4[0] - 19 * mm, A4[1] - 9 * mm, "Change documentation")
            canvas.setStrokeColor(LINE)
            canvas.line(19 * mm, 11 * mm, A4[0] - 19 * mm, 11 * mm)
            canvas.setFont(FONT, 7.5)
            canvas.drawString(19 * mm, 7 * mm, "Prepared 4 August 2026")
            canvas.drawRightString(A4[0] - 19 * mm, 7 * mm, f"Page {doc.page}")
        canvas.restoreState()


def p(text, style="BodyX"):
    return Paragraph(text, styles[style])


def bullets(items):
    return [p(f"- {item}", "BulletX") for item in items]


def section(title, number):
    return KeepTogether([
        Table(
            [[p(number, "Label"), p(title, "Section")]],
            colWidths=[18 * mm, 150 * mm],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (0, 0), SKY),
                ("BOX", (0, 0), (0, 0), 0.5, colors.HexColor("#BED2FF")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (0, 0), 5),
                ("RIGHTPADDING", (0, 0), (0, 0), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]),
        ),
        Spacer(1, 2 * mm),
    ])


def info_cards(cards):
    cells = []
    for label, value in cards:
        cells.append([
            p(label, "Label"),
            Spacer(1, 2),
            p(value, "BodySmall"),
        ])
    table = Table([cells], colWidths=[56 * mm] * len(cells))
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.6, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table


def feature_table(rows):
    data = [[p("Area", "TableHead"), p("Implemented behavior", "TableHead"), p("Student outcome", "TableHead")]]
    for area, behavior, outcome in rows:
        data.append([p(area, "TableCell"), p(behavior, "TableCell"), p(outcome, "TableCell")])
    table = Table(data, colWidths=[35 * mm, 79 * mm, 54 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, PALE]),
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


def status_table():
    data = [
        [p("Visual status", "TableHead"), p("Meaning", "TableHead"), p("Student interpretation", "TableHead")],
        [p("Red - Untouched", "TableCell"), p("Chapter teaching has not started.", "TableCell"), p("No class progress has been recorded yet.", "TableCell")],
        [p("Yellow - In progress", "TableCell"), p("The chapter is currently being taught.", "TableCell"), p("Students can expect additional classes or activities.", "TableCell")],
        [p("Green - Completed", "TableCell"), p("The teacher marked the chapter complete.", "TableCell"), p("The chapter has finished its planned classroom coverage.", "TableCell")],
    ]
    table = Table(data, colWidths=[43 * mm, 60 * mm, 65 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("BACKGROUND", (0, 1), (0, 1), colors.HexColor("#FDECEC")),
        ("BACKGROUND", (0, 2), (0, 2), colors.HexColor("#FFF7DD")),
        ("BACKGROUND", (0, 3), (0, 3), colors.HexColor("#EAF8F1")),
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


story = []

# Cover
story += [
    Spacer(1, 47 * mm),
    p("STUDENT PORTAL", "Label"),
    Spacer(1, 4 * mm),
    p("Changes Documentation", "DocTitle"),
    p("Tuition Management System", "CoverSub"),
    Spacer(1, 12 * mm),
    Table(
        [[p("IMPLEMENTATION HANDOFF", "Label")], [p("Academic visibility, shared learning progress, digital calendar, exam resources, and demonstration data.", "CoverSub")]],
        colWidths=[155 * mm],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#132C50")),
            ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#315680")),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ]),
    ),
    Spacer(1, 47 * mm),
    p("Prepared for project review and stakeholder acceptance", "CoverSub"),
    p("Version 1.0  |  4 August 2026", "CoverSub"),
    PageBreak(),
]

# Overview
story += [
    section("Executive summary", "01"),
    p("The student portal has been expanded from a basic academic view into a more complete student workspace. The changes focus on making teacher-published learning information visible, improving calendar planning, exposing shared exam resources, and keeping the interface useful while production data is still being connected."),
    Spacer(1, 2 * mm),
    info_cards([
        ("Primary goal", "Give students one reliable place to follow classes, syllabus progress, results, events, billing, and notices."),
        ("Data approach", "Real API data is preferred. Temporary demo data fills only empty areas so screens remain testable."),
        ("Access model", "The portal remains student-facing and read-only for academic and financial records."),
    ]),
    Spacer(1, 7 * mm),
    p("Change overview", "Subsection"),
    feature_table([
        ("Syllabus", "Teacher-created subjects, chapters, progress states, daily notes, update dates, and teacher identity are shown to students.", "Students can follow the same syllabus progress recorded by the teacher."),
        ("Results", "Published results can include a teacher-shared exam sheet with a direct view action.", "Students can review both marks and the supporting exam document."),
        ("Calendar", "A real month calendar supports navigation, date selection, event markers, and an upcoming-events panel.", "Academic dates are easier to discover and plan around."),
        ("Demo content", "Fallback records populate otherwise empty portal modules without replacing available live records.", "Stakeholders can review the complete student experience before all production data exists."),
    ]),
    Spacer(1, 7 * mm),
    Table(
        [[p("Scope note", "Label"), p("This document describes the student portal changes currently implemented in the codebase. It does not document accountant or teacher editing workflows except where their published information appears to students.", "Callout")]],
        colWidths=[28 * mm, 140 * mm],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), SKY),
            ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#B8CEFA")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]),
    ),
    PageBreak(),
]

# Syllabus
story += [
    section("Shared syllabus and daily chapter progress", "02"),
    p("The student syllabus view now reflects the syllabus maintained by teachers. The wording and displayed ownership identify the teacher as the author, avoiding the earlier implication that the syllabus belonged to the student."),
    p("What students can see", "Subsection"),
    *bullets([
        "Subject name, class, assigned teacher, and total chapter count.",
        "Every chapter created by the teacher, including its title and current teaching status.",
        "Daily class update notes and the date of the latest recorded progress.",
        "Teacher attribution so students know who published the academic information.",
    ]),
    Spacer(1, 4 * mm),
    p("Chapter progress language", "Subsection"),
    status_table(),
    Spacer(1, 7 * mm),
    p("Automatic refresh behavior", "Subsection"),
    p("While the syllabus view is open, the portal requests updated data every 10 seconds. It also refreshes when the browser tab becomes visible again. This gives students near-real-time access to teacher updates without requiring a manual page reload."),
    Table(
        [[p("Student opens syllabus", "TableCell"), p("Portal loads the latest syllabus", "TableCell"), p("Teacher update is detected", "TableCell"), p("Visible chapter state and notes refresh", "TableCell")]],
        colWidths=[42 * mm] * 4,
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), PALE),
            ("BOX", (0, 0), (-1, -1), 0.5, LINE),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]),
    ),
    Spacer(1, 7 * mm),
    p("Interface clarification", "Subsection"),
    p("The internal refresh explanation was removed from the student-facing syllabus screen. Automatic synchronization still works, but the interface now emphasizes actual subjects, chapters, progress, and teacher updates."),
    PageBreak(),
]

# Results and calendar
story += [
    section("Results and teacher-shared exam sheets", "03"),
    p("Published results now support an attached exam sheet supplied by the teacher. This places the supporting document beside the student's result instead of leaving it disconnected from the marks record."),
    *bullets([
        "A Teacher-shared exam sheet area appears within the result detail.",
        "When a file URL is available, View exam sheet opens the resource in a new browser tab.",
        "When no document was shared, the interface clearly displays Not shared.",
        "Demo results include sample sheet links so the complete interaction can be reviewed immediately.",
    ]),
    Spacer(1, 7 * mm),
    section("Digital academic calendar", "04"),
    p("The academic calendar was redesigned as an interactive digital calendar rather than a simple event list. It combines a complete month view with a focused upcoming-events panel."),
    p("Calendar capabilities", "Subsection"),
    feature_table([
        ("Month view", "A 42-cell grid displays a consistent six-week month layout.", "Dates remain aligned and easy to scan across different months."),
        ("Navigation", "Previous month, next month, and Today controls are provided.", "Students can move through the academic schedule quickly."),
        ("Date details", "Selecting a date reveals the events scheduled for that day.", "The calendar supports both overview and detail-level use."),
        ("Event markers", "Dates with events include visible indicators.", "Important dates can be recognized without opening each day."),
        ("Upcoming panel", "Future events are listed beside the calendar and can be clicked to jump to their month and date.", "The next important activity remains visible at a glance."),
    ]),
    Spacer(1, 5 * mm),
    p("Supported event categories: Holiday, Exam, Ceremony, and Fee due. The layout is responsive for smaller screens, includes dark-theme styling, and uses accessible interactive controls.", "BodyX"),
    PageBreak(),
]

# Demo data
story += [
    section("Temporary student demo data", "05"),
    p("The student portal is populated with representative sample information so each major module can be reviewed before complete backend records are available. The fallback is intentionally non-destructive: populated live arrays remain in use, and only empty areas receive demo records."),
    p("Modules covered", "Subsection"),
    feature_table([
        ("Identity", "Student profile and class context.", "Portal header and personal context look complete."),
        ("Learning", "Sessions, today's timetable, homework, results, insights, syllabus, and attendance.", "Academic workflows can be demonstrated end to end."),
        ("Finance", "Invoices and billing-related sample records.", "Students can review the intended financial information layout."),
        ("Planning", "Academic events and notifications.", "Calendar and alert experiences remain testable."),
        ("Records", "Certificates and supporting student records.", "Document-oriented portal sections do not appear empty."),
    ]),
    Spacer(1, 6 * mm),
    p("Fallback rule", "Subsection"),
    Table(
        [
            [p("Incoming data", "TableHead"), p("Portal behavior", "TableHead")],
            [p("Live array contains records", "TableCell"), p("Keep and display the live API data.", "TableCell")],
            [p("Live array is empty", "TableCell"), p("Fill that module with the matching demo records.", "TableCell")],
        ],
        colWidths=[68 * mm, 100 * mm],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, PALE]),
            ("GRID", (0, 0), (-1, -1), 0.5, LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]),
    ),
    Spacer(1, 8 * mm),
    Table(
        [[p("Important", "Label"), p("Demo content is temporary presentation data. It is not intended to replace production records and can be removed once all live student datasets are reliably available.", "Callout")]],
        colWidths=[28 * mm, 140 * mm],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF7DD")),
            ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#F1D17C")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]),
    ),
    PageBreak(),
]

# Implementation and QA
story += [
    section("Implementation reference", "06"),
    p("The changes are concentrated in the student portal page, styling, client-side data adapter, service layer, and the API mapping that exposes the teacher's display name."),
    feature_table([
        ("StudentPortal.tsx", "Renders syllabus progress, result sheet access, calendar interactions, upcoming events, and student sections.", "Primary student-facing interface."),
        ("studentPortal.css", "Provides responsive calendar, status, event, result-resource, and dark-theme presentation.", "Consistent appearance across screen sizes and themes."),
        ("studentPortalData.ts", "Defines representative demo data and the merge rule that fills empty live collections.", "Temporary but complete review experience."),
        ("studentPortalService.ts", "Applies the student demo fallback around portal API responses.", "Live-first data behavior."),
        ("users.ts", "Returns teacherName in the syllabus mapping used by the student portal.", "Correct author attribution."),
    ]),
    Spacer(1, 7 * mm),
    p("Validation completed", "Subsection"),
    *bullets([
        "Web application production build completed successfully.",
        "API service build completed successfully.",
        "Lint checks completed; only previously existing warnings remained.",
        "A source diff quality check completed successfully.",
    ]),
    Spacer(1, 7 * mm),
    p("Acceptance checklist", "Subsection"),
    feature_table([
        ("Syllabus sync", "Update a chapter as a teacher and keep the student syllabus open.", "The new state and note should appear within approximately 10 seconds."),
        ("Exam sheet", "Open a published student result with a shared sheet.", "The sheet action should open the attached resource in a new tab."),
        ("Calendar", "Navigate months, select dates, and choose an upcoming event.", "The calendar should move to the correct date and display its detail."),
        ("Fallback", "Load a student account with partially empty data collections.", "Live records remain intact; only empty modules receive sample content."),
    ]),
    Spacer(1, 7 * mm),
    Table(
        [[p("Outcome", "Label"), p("Students now have a fuller, clearer, and more transparent academic workspace, with teacher-owned syllabus progress, shared exam evidence, practical calendar planning, and useful content during the current data-integration stage.", "Callout")]],
        colWidths=[28 * mm, 140 * mm],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EAF8F1")),
            ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#A9DCC5")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]),
    ),
]


OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc = StudentPortalDoc(str(OUTPUT))
doc.build(story)
print(OUTPUT)
