from pathlib import Path

import fitz
import pdfplumber
from PIL import Image, ImageDraw
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[2]
PDF = ROOT / "output" / "pdf" / "student_portal_changes_documentation.pdf"
RENDER_DIR = ROOT / "tmp" / "pdfs" / "student_portal_rendered"
RENDER_DIR.mkdir(parents=True, exist_ok=True)

doc = fitz.open(PDF)
thumbs = []
for index, page in enumerate(doc):
    pix = page.get_pixmap(matrix=fitz.Matrix(1.45, 1.45), alpha=False)
    page_path = RENDER_DIR / f"page-{index + 1}.png"
    pix.save(page_path)
    image = Image.open(page_path).convert("RGB")
    image.thumbnail((390, 550))
    thumbs.append((index + 1, image.copy()))

cols = 2
cell_w, cell_h = 420, 590
rows = (len(thumbs) + cols - 1) // cols
sheet = Image.new("RGB", (cols * cell_w, rows * cell_h), "#DCE3ED")
draw = ImageDraw.Draw(sheet)
for pos, (page_no, image) in enumerate(thumbs):
    x = (pos % cols) * cell_w + 15
    y = (pos // cols) * cell_h + 28
    sheet.paste(image, (x, y))
    draw.text((x, 7 + (pos // cols) * cell_h), f"Page {page_no}", fill="#172033")
sheet_path = RENDER_DIR / "contact-sheet.png"
sheet.save(sheet_path)

reader = PdfReader(PDF)
with pdfplumber.open(PDF) as plumber:
    extracted = [page.extract_text() or "" for page in plumber.pages]

required = [
    "Shared syllabus and daily chapter progress",
    "Results and teacher-shared exam sheets",
    "Digital academic calendar",
    "Temporary student demo data",
    "Validation completed",
]
all_text = "\n".join(extracted)
missing = [term for term in required if term not in all_text]
print(f"pages={len(reader.pages)}")
print(f"page_sizes={[tuple(round(v, 1) for v in page.mediabox[2:]) for page in reader.pages]}")
print(f"empty_text_pages={[i + 1 for i, value in enumerate(extracted) if len(value.strip()) < 40]}")
print(f"missing_required_terms={missing}")
print(f"contact_sheet={sheet_path}")
if missing:
    raise SystemExit(1)
