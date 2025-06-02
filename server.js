const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware voor JSON parsing
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Puppeteer Web Scraper API is actief',
    environment: process.env.VERCEL ? 'Vercel Serverless' : 'Local',
    endpoints: {
      scrape: 'GET /scrape?url=<url-om-te-scrapen>'
    }
  });
});

// Scrape endpoint
app.get('/scrape', async (req, res) => {
  const { url } = req.query;

  // Valideer of URL parameter aanwezig is
  if (!url) {
    return res.status(400).json({
      error: 'URL parameter is vereist',
      voorbeeld: '/scrape?url=https://example.com'
    });
  }

  // Valideer URL format
  try {
    new URL(url);
  } catch (error) {
    return res.status(400).json({
      error: 'Ongeldige URL format',
      url: url
    });
  }

  let browser;
  
  try {
    // Configuratie voor Vercel/serverless environment
    const puppeteerConfig = {
      headless: "new", // Fix voor deprecation warning
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    };

    // Als we op Vercel draaien, gebruik chrome-aws-lambda
    if (process.env.VERCEL) {
      puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable';
    }

    // Start Puppeteer browser
    browser = await puppeteer.launch(puppeteerConfig);

    const page = await browser.newPage();
    
    // Stel timeout en user agent in
    await page.setDefaultNavigationTimeout(25000); // Korter voor serverless
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    console.log(`Scraping: ${url}`);
    
    // Navigeer naar de pagina
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 25000 
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
    res.json({
      url: url,
      tekst: opgeschoondeTekst,
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL ? 'Vercel' : 'Local'
    });

  } catch (error) {
    console.error('Scraping fout:', error.message);
    
    // Zorg ervoor dat browser wordt gesloten bij fout
    if (browser) {
      await browser.close();
    }

    // Bepaal fouttype en stuur juiste response
    if (error.name === 'TimeoutError') {
      res.status(408).json({
        error: 'Timeout: Pagina kon niet binnen 25 seconden worden geladen',
        url: url
      });
    } else if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
      res.status(404).json({
        error: 'URL kon niet worden bereikt (DNS fout)',
        url: url
      });
    } else if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
      res.status(503).json({
        error: 'Verbinding geweigerd door server',
        url: url
      });
    } else {
      res.status(500).json({
        error: 'Er is een fout opgetreden bij het scrapen',
        details: error.message,
        url: url
      });
    }
  }
});

// Voor Vercel serverless
if (process.env.VERCEL) {
  module.exports = app;
} else {
  // Voor lokale development
  app.listen(PORT, () => {
    console.log(`🚀 Puppeteer Web Scraper API draait op poort ${PORT}`);
    console.log(`📖 Gebruik: http://localhost:${PORT}/scrape?url=<url-om-te-scrapen>`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Server wordt afgesloten...');
    process.exit(0);
  });

  module.exports = app;
} 