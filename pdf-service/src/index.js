/**
 * RIC PDF Service — Microservicio Puppeteer
 * Genera PDFs de memorias de cálculo en formato RIC
 * Puerto: 9000
 */
const express = require('express');
const puppeteer = require('puppeteer-core');

const app = express();
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 9000;
const CHROMIUM_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'pdf-service', version: '1.0.0' });
});

/**
 * POST /generate
 * Body: { html: string, filename?: string }
 * Returns: PDF binary
 */
app.post('/generate', async (req, res) => {
  const { html, filename = 'calculo-ric.pdf' } = req.body;

  if (!html) {
    return res.status(400).json({ ok: false, error: 'html requerido' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROMIUM_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdf.length,
    });
    res.send(pdf);
  } catch (err) {
    console.error('Error generando PDF:', err);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`RIC PDF Service escuchando en puerto ${PORT}`);
});
