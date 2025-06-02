const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// Serverless function handler voor Vercel
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url: targetUrl } = req.query;

  // Als er een URL parameter is, ga naar scraping
  if (targetUrl) {
    // Valideer URL format
    try {
      new URL(targetUrl);
    } catch (error) {
      return res.status(400).json({
        error: 'Ongeldige URL format',
        url: targetUrl
      });
    }

    let browser;
    
    try {
      console.log(`Scraping: ${targetUrl}`);
      
      // Start browser met @sparticuz/chromium (geoptimaliseerd voor serverless)
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });

      const page = await browser.newPage();
      
      // Stel timeout en user agent in (korter voor serverless)
      await page.setDefaultNavigationTimeout(20000);
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      // Navigeer naar de pagina
      await page.goto(targetUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 20000 
      });

      // Probeer tekst uit <main> te halen, anders uit <body>
      const tekst = await page.evaluate(() => {
        // Eerst proberen main element
        const mainElement = document.querySelector('main');
        if (mainElement) {
          return mainElement.innerText.trim();
        }
        
        // Anders body element
        const bodyElement = document.querySelector('body');
        if (bodyElement) {
          // Verwijder script en style tags inhoud
          const scripts = bodyElement.querySelectorAll('script, style');
          scripts.forEach(script => script.remove());
          
          return bodyElement.innerText.trim();
        }
        
        return 'Geen tekst gevonden';
      });

      // Schoon de tekst op (verwijder extra whitespace)
      const opgeschoondeTekst = tekst
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();

      // Sluit browser
      await browser.close();

      // Stuur response
      return res.json({
        url: targetUrl,
        tekst: opgeschoondeTekst,
        timestamp: new Date().toISOString(),
        environment: 'Vercel Serverless (@sparticuz/chromium)'
      });

    } catch (error) {
      console.error('Scraping fout:', error.message);
      
      // Zorg ervoor dat browser wordt gesloten bij fout
      if (browser) {
        await browser.close();
      }

      // Bepaal fouttype en stuur juiste response
      if (error.name === 'TimeoutError') {
        return res.status(408).json({
          error: 'Timeout: Pagina kon niet binnen 20 seconden worden geladen',
          url: targetUrl
        });
      } else if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
        return res.status(404).json({
          error: 'URL kon niet worden bereikt (DNS fout)',
          url: targetUrl
        });
      } else if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
        return res.status(503).json({
          error: 'Verbinding geweigerd door server',
          url: targetUrl
        });
      } else {
        return res.status(500).json({
          error: 'Er is een fout opgetreden bij het scrapen',
          details: error.message,
          url: targetUrl
        });
      }
    }
  }

  // Health check endpoint (alleen als er geen URL parameter is)
  return res.json({
    message: 'Puppeteer Web Scraper API is actief op Vercel',
    environment: 'Vercel Serverless (@sparticuz/chromium)',
    endpoints: {
      scrape: 'GET /api?url=<url-om-te-scrapen>'
    },
    usage: {
      healthCheck: 'GET /api/',
      scraping: 'GET /api?url=https://example.com'
    },
    timestamp: new Date().toISOString()
  });
}; 