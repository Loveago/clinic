const fs = require('fs');
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error(JSON.stringify({ error: 'PDF path required' }));
    process.exit(1);
  }
  const buffer = fs.readFileSync(pdfPath);
  const pages = [];

  const options = {
    pagerender: async (pageData) => {
      const textContent = await pageData.getTextContent();
      let lastY;
      let text = '';
      for (const item of textContent.items) {
        const y = item.transform ? item.transform[5] : undefined;
        if (lastY !== undefined && y !== undefined && Math.abs(lastY - y) > 4) {
          text += '\n';
        }
        text += item.str;
        if (item.hasEOL) text += '\n';
        lastY = y;
      }
      pages.push({
        page: (pageData.pageIndex !== undefined ? pageData.pageIndex : pages.length) + 1,
        text: text.replace(/\r/g, '').trim(),
      });
      return text;
    },
  };

  const data = await pdfParse(buffer, options);
  pages.sort((a, b) => a.page - b.page);

  const totalPages = data.numpages || pages.length || 1;
  const totalChars = pages.reduce((acc, p) => acc + p.text.replace(/\s+/g, '').length, 0);
  const avgCharsPerPage = totalChars / Math.max(1, totalPages);
  const isScannedPdf = avgCharsPerPage < 35;

  process.stdout.write(JSON.stringify({ pages, totalPages, isScannedPdf }));
}

main().catch((err) => {
  const msg = err && err.message ? err.message : String(err);
  if (/password|encrypt/i.test(msg)) {
    console.error('PDF is password-protected or encrypted. Please upload an unencrypted PDF.');
  } else {
    console.error(msg);
  }
  process.exit(1);
});

