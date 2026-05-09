const express = require("express");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, BorderStyle, WidthType,
  ShadingType, PageNumber, LevelFormat,
} = require("docx");

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ── Branding constants ────────────────────────────────────────────
const BRAND_BLUE  = "1B3A6B";
const ACCENT_BLUE = "2E5FAC";
const LIGHT_BG    = "EBF0F8";
const GREY        = "555555";
const WHITE       = "FFFFFF";
const A4_W        = 11906;
const A4_H        = 16838;
const MARGIN      = 1080;
const CONTENT_W   = A4_W - MARGIN * 2;

// ── Helper builders ───────────────────────────────────────────────
function hr() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: ACCENT_BLUE, space: 4 } },
    spacing: { before: 80, after: 200 },
    children: [],
  });
}

function sectionHead(label) {
  return new Paragraph({
    spacing: { before: 320, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT_BLUE, space: 3 } },
    children: [new TextRun({ text: label.toUpperCase(), bold: true, size: 22, color: BRAND_BLUE, font: "Arial" })],
  });
}

function subHead(text) {
  return new Paragraph({
    spacing: { before: 180, after: 70 },
    children: [new TextRun({ text, bold: true, size: 21, color: ACCENT_BLUE, font: "Arial" })],
  });
}

function body(text, italic = false) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 20, color: "333333", font: "Arial", italics: italic })],
  });
}

function bulletItem(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 50, after: 50 },
    children: [new TextRun({ text, size: 20, color: "222222", font: "Arial" })],
  });
}

function bulletList(lines) {
  return lines
    .map(l => l.trim())
    .filter(Boolean)
    .map(bulletItem);
}

function splitLines(str) {
  return (str || "").split(/\n/).map(l => l.trim()).filter(Boolean);
}

function infoRow(label, value) {
  const nb = { style: BorderStyle.NONE, size: 0, color: WHITE };
  const borders = { top: nb, bottom: nb, left: nb, right: nb };
  return new TableRow({
    children: [
      new TableCell({
        borders, width: { size: 3000, type: WidthType.DXA },
        margins: { top: 60, bottom: 60, left: 0, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, color: BRAND_BLUE, font: "Arial" })] })],
      }),
      new TableCell({
        borders, width: { size: CONTENT_W - 3000, type: WidthType.DXA },
        margins: { top: 60, bottom: 60, left: 0, right: 0 },
        children: [new Paragraph({ children: [new TextRun({ text: value || "N/A", size: 20, color: "222222", font: "Arial" })] })],
      }),
    ],
  });
}

function achieveRow(task, result, isHeader = false) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "AABBD4" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const colA = Math.round(CONTENT_W * 0.37);
  const colB = CONTENT_W - colA;
  return new TableRow({
    children: [
      new TableCell({
        borders, width: { size: colA, type: WidthType.DXA },
        shading: { fill: isHeader ? BRAND_BLUE : LIGHT_BG, type: ShadingType.CLEAR },
        margins: { top: 90, bottom: 90, left: 140, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: task, bold: isHeader, size: isHeader ? 20 : 19, color: isHeader ? WHITE : "1A2F52", font: "Arial" })] })],
      }),
      new TableCell({
        borders, width: { size: colB, type: WidthType.DXA },
        shading: { fill: isHeader ? BRAND_BLUE : WHITE, type: ShadingType.CLEAR },
        margins: { top: 90, bottom: 90, left: 140, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: result, bold: isHeader, size: isHeader ? 20 : 19, color: isHeader ? WHITE : "333333", font: "Arial" })] })],
      }),
    ],
  });
}

// ── Document builder ──────────────────────────────────────────────
function buildDoc(d) {
  const achieveRows = (d.achievements || [])
    .filter(r => r.task && r.task.trim())
    .map(r => achieveRow(r.task.trim(), (r.result || "").trim()));

  const children = [
    new Paragraph({
      spacing: { before: 140, after: 60 },
      children: [new TextRun({ text: "WEEKLY REPORT", bold: true, size: 52, color: BRAND_BLUE, font: "Arial" })],
    }),
    new Paragraph({
      spacing: { before: 0, after: 50 },
      children: [new TextRun({ text: d.name || "Staff Member", bold: true, size: 30, color: ACCENT_BLUE, font: "Arial" })],
    }),
    new Paragraph({
      spacing: { before: 0, after: 40 },
      children: [new TextRun({ text: `${d.position || ""}  •  Week Ending: ${d.weekEnding || ""}`, size: 20, color: GREY, font: "Arial" })],
    }),
    hr(),

    sectionHead("1. Employee Details"),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [3000, CONTENT_W - 3000],
      rows: [
        infoRow("Full Name:", d.name),
        infoRow("Position:", d.position),
        infoRow("Department:", d.department),
        infoRow("Week Ending:", d.weekEnding),
        infoRow("Hours Worked:", d.hours),
        infoRow("Meetings Attended:", d.meetings),
        infoRow("Absence / Leave:", d.absence || "N/A"),
        infoRow("Satisfaction (out of 10):", d.satisfaction ? `${d.satisfaction} / 10` : "Not provided"),
      ],
    }),

    sectionHead("2. Executive Summary"),
    body(d.summary || "Not provided"),

    sectionHead("3. Key Activities Completed"),
    ...bulletList(splitLines(d.activities)),

    sectionHead("4. Department / Project Updates"),
  ];

  if (d.socialMedia && d.socialMedia.trim()) {
    children.push(subHead("Marketing & Social Media"), ...bulletList(splitLines(d.socialMedia)));
  }
  if (d.projects && d.projects.trim()) {
    children.push(subHead("Projects & Other Work"), ...bulletList(splitLines(d.projects)));
  }
  if (d.meetingNotes && d.meetingNotes.trim()) {
    children.push(subHead("Meetings & Calls"), ...bulletList(splitLines(d.meetingNotes)));
  }
  if (!d.socialMedia && !d.projects && !d.meetingNotes) {
    children.push(body("Not provided"));
  }

  children.push(
    sectionHead("5. Collaboration With Colleagues"),
    ...bulletList(splitLines(d.collaboration)),
  );

  children.push(
    sectionHead("6. Results / Achievements"),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [Math.round(CONTENT_W * 0.37), CONTENT_W - Math.round(CONTENT_W * 0.37)],
      rows: [
        achieveRow("Task / Area", "Result / Evidence", true),
        ...achieveRows.length ? achieveRows : [achieveRow("Not provided", "")],
      ],
    }),
  );

  children.push(
    sectionHead("7. Challenges / Delays"),
    ...(d.challenges && d.challenges.trim()
      ? bulletList(splitLines(d.challenges))
      : [body("No significant challenges or delays reported this week.", true)]),
  );

  children.push(
    sectionHead("8. Next Actions for Next Week"),
    ...bulletList(splitLines(d.nextActions)),
  );

  children.push(
    sectionHead("9. Notes for Management"),
    ...(d.managementNotes && d.managementNotes.trim()
      ? bulletList(splitLines(d.managementNotes))
      : [body("No items requiring management attention this week.", true)]),
  );

  children.push(
    hr(),
    new Paragraph({ spacing: { before: 100, after: 40 }, children: [new TextRun({ text: "Submitted by:", size: 18, color: GREY, font: "Arial" })] }),
    new Paragraph({ spacing: { before: 0, after: 20 }, children: [new TextRun({ text: d.name || "", bold: true, size: 21, color: BRAND_BLUE, font: "Arial" })] }),
    new Paragraph({ spacing: { before: 0, after: 20 }, children: [new TextRun({ text: `${d.position || ""}  |  Accel Capital Partners Ltd`, size: 19, color: GREY, font: "Arial" })] }),
    new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: `Week Ending: ${d.weekEnding || ""}`, size: 19, color: GREY, font: "Arial" })] }),
  );

  return new Document({
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 560, hanging: 280 } } },
        }],
      }],
    },
    styles: { default: { document: { run: { font: "Arial", size: 20 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: A4_W, height: A4_H },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT_BLUE, space: 3 } },
            spacing: { before: 0, after: 140 },
            children: [
              new TextRun({ text: "ACCEL CAPITAL PARTNERS LTD", bold: true, size: 18, color: BRAND_BLUE, font: "Arial" }),
              new TextRun({ text: "   |   Weekly Staff Report   |   Confidential", size: 17, color: GREY, font: "Arial" }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: ACCENT_BLUE, space: 3 } },
            spacing: { before: 100, after: 0 },
            children: [
              new TextRun({ text: "Internal Use Only   •   www.accelcapital.co.uk   •   Page ", size: 16, color: GREY, font: "Arial" }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GREY, font: "Arial" }),
            ],
          })],
        }),
      },
      children,
    }],
  });
}

// ── API endpoint ──────────────────────────────────────────────────
app.post("/generate", async (req, res) => {
  try {
    const doc = buildDoc(req.body);
    const buffer = await Packer.toBuffer(doc);
    const safeName = (req.body.name || "Staff").replace(/[^a-zA-Z0-9 ]/g, "").replace(/ /g, "_");
    const dateSlug = (req.body.weekEnding || "").replace(/[^0-9]/g, "-") || "Report";
    res.setHeader("Content-Disposition", `attachment; filename="Weekly_Report_${safeName}_${dateSlug}.docx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 4040;
app.listen(PORT, () => console.log(`Weekly Report Generator → http://localhost:${PORT}`));
