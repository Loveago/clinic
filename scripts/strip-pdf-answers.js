const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const pdfParse = require('pdf-parse');

async function getPageTexts(buf) {
  const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const texts = [];
  await pdfParse(buf, {
    pagerender: async (pageData) => {
      const tc = await pageData.getTextContent();
      let lastY;
      let pageText = '';
      for (const item of tc.items) {
        if (lastY === item.transform[5] || lastY === undefined) {
          pageText += item.str;
        } else {
          pageText += '\n' + item.str;
        }
        lastY = item.transform[5];
      }
      texts.push(pageText);
      return pageText;
    },
  });
  return { srcDoc, texts };
}

function stripAnswersFromText(rawText) {
  let text = rawText
    .replace(/\r/g, '')
    .replace(/Action Health College\s*•[^\n]*/gi, '')
    .replace(/PRACTICAL APPLICATION QUESTIONS AND SUGGESTED\s*\n?\s*RESPONSES/gi, 'PRACTICAL APPLICATION QUESTIONS')
    .replace(/ESSAY QUESTIONS AND MODEL ANSWERS/gi, 'ESSAY QUESTIONS')
    .replace(/ESSAY QUESTIONS & MODEL ANSWERS/gi, 'ESSAY QUESTIONS');

  const lines = text.split('\n');
  const out = [];
  let skippingAnswer = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (/^(Answer|Suggested Response)\s*:/i.test(line)) {
      skippingAnswer = true;
      continue;
    }

    if (skippingAnswer) {
      if (
        /^Question\s+\d+\s*:/i.test(line) ||
        /^PRACTICAL APPLICATION QUESTIONS/i.test(line) ||
        /^ESSAY QUESTIONS/i.test(line) ||
        /^CONCLUSION\b/i.test(line)
      ) {
        skippingAnswer = false;
      } else {
        continue;
      }
    }

    if (line.length > 0 || (out.length > 0 && out[out.length - 1] !== '')) {
      out.push(line);
    }
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function wrapLines(text, font, fontSize, maxWidth) {
  const result = [];
  for (const para of text.split('\n')) {
    if (!para.trim()) {
      result.push({ text: '', isHeading: false });
      continue;
    }
    const isHeading =
      /^(ESSAY QUESTIONS|PRACTICAL APPLICATION QUESTIONS|CONCLUSION|Question\s+\d+\s*:)/i.test(para.trim());
    const words = para.split(/\s+/);
    let current = '';
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      const safeCandidate = candidate.replace(/[^\x20-\x7E]/g, "'");
      if (font.widthOfTextAtSize(safeCandidate, fontSize) > maxWidth && current) {
        result.push({ text: current.replace(/[^\x20-\x7E]/g, "'"), isHeading });
        current = w;
      } else {
        current = candidate;
      }
    }
    if (current) {
      result.push({ text: current.replace(/[^\x20-\x7E]/g, "'"), isHeading });
    }
  }
  return result;
}

async function processPdf(filePath) {
  const buf = fs.readFileSync(filePath);
  const { srcDoc, texts } = await getPageTexts(buf);

  const firstAnsIdx = texts.findIndex((t) =>
    /\b(Answer|Suggested Response)\s*:/i.test(t) ||
    /ESSAY QUESTIONS|PRACTICAL APPLICATION QUESTIONS/i.test(t)
  );

  if (firstAnsIdx === -1) {
    return { skipped: true };
  }

  const outDoc = await PDFDocument.create();
  if (firstAnsIdx > 0) {
    const keepIndices = Array.from({ length: firstAnsIdx }, (_, i) => i);
    const copied = await outDoc.copyPages(srcDoc, keepIndices);
    for (const p of copied) outDoc.addPage(p);
  }

  const tailRaw = texts.slice(firstAnsIdx).join('\n');
  const cleanedText = stripAnswersFromText(tailRaw);

  const fontRegular = await outDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await outDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const maxWidth = pageWidth - margin * 2;
  const fontSize = 10.5;
  const lineHeight = 15.5;

  const wrapped = wrapLines(cleanedText, fontRegular, fontSize, maxWidth);

  let page = outDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawFooter = (p) => {
    p.drawText('Action Health College - Study & Reflection Questions (Refer to Module Text for Answers)', {
      x: margin,
      y: 28,
      size: 8,
      font: fontRegular,
      color: rgb(0.45, 0.48, 0.52),
    });
  };

  for (const item of wrapped) {
    if (y < margin + 30) {
      drawFooter(page);
      page = outDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    if (!item.text) {
      y -= 8;
      continue;
    }
    page.drawText(item.text, {
      x: margin,
      y,
      size: item.isHeading ? 11 : fontSize,
      font: item.isHeading ? fontBold : fontRegular,
      color: item.isHeading ? rgb(0.03, 0.22, 0.2) : rgb(0.15, 0.18, 0.22),
    });
    y -= lineHeight;
  }
  drawFooter(page);

  const saved = await outDoc.save();
  fs.writeFileSync(filePath, Buffer.from(saved));
  return { skipped: false, originalPages: texts.length, newPages: outDoc.getPageCount() };
}

(async () => {
  const dir = path.join(process.cwd(), 'storage', 'pdfs');
  const files = fs.readdirSync(dir).filter((f) => f.startsWith('module-')).sort();
  for (const f of files) {
    const full = path.join(dir, f);
    const res = await processPdf(full);
    const verify = await pdfParse(fs.readFileSync(full));
    const stillHasAns = /\b(Answer|Suggested Response)\s*:/i.test(verify.text);
    const hasQuestions = /Question\s+\d+\s*:/i.test(verify.text);
    console.log(f, res, 'stillHasAnswers:', stillHasAns, 'hasQuestions:', hasQuestions);
  }
})();
