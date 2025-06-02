# Puppeteer Web Scraper API

Een eenvoudige Express.js API die Puppeteer gebruikt om webpagina's te scrapen en de zichtbare tekst te extraheren.

## Functies

- 🌐 Scrape elke webpagina via een REST API
- 📝 Extraheert tekst uit `<main>` of `<body>` elementen
- 🛡️ Uitgebreide foutafhandeling voor timeouts en ongeldige URL's
- 🐳 Docker support voor eenvoudige deployment
- ⚡ Snelle en betrouwbare scraping met Puppeteer

## Lokaal draaien

### Vereisten
- Node.js 16 of hoger
- npm

### Installatie
```bash
# Installeer dependencies
npm install

# Start de server
npm start
```

De API draait nu op `http://localhost:3001`

## Docker gebruik

### Build de container
```bash
docker build -t puppeteer-scraper .
```

### Run de container
```bash
docker run -p 3001:3001 puppeteer-scraper
```

## API Endpoints

### Health Check
```
GET /
```
Retourneert status informatie over de API.

### Scrape Webpagina
```
GET /scrape?url=<url-om-te-scrapen>
```

**Parameters:**
- `url` (required): De URL van de webpagina om te scrapen

**Voorbeeld:**
```bash
curl "http://localhost:3001/scrape?url=https://example.com"
```

**Response:**
```json
{
  "url": "https://example.com",
  "tekst": "Opgeschoonde tekst van de webpagina...",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

## Foutafhandeling

De API handelt verschillende fouttypes af:

- **400 Bad Request**: Ontbrekende of ongeldige URL
- **404 Not Found**: URL kan niet worden bereikt (DNS fout)
- **408 Request Timeout**: Pagina laadt niet binnen 30 seconden
- **503 Service Unavailable**: Verbinding geweigerd door server
- **500 Internal Server Error**: Algemene server fout

## Technische Details

- **Express.js**: Web framework
- **Puppeteer**: Headless Chrome voor web scraping
- **Port**: 3001
- **Timeout**: 30 seconden per request
- **Browser**: Headless Chrome met geoptimaliseerde flags voor containers

## Voorbeelden

### Succesvol scrapen
```bash
curl "http://localhost:3001/scrape?url=https://httpbin.org/html"
```

### Foutieve URL
```bash
curl "http://localhost:3001/scrape?url=invalid-url"
```

### Ontbrekende URL parameter
```bash
curl "http://localhost:3001/scrape"
``` 