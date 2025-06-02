# Gebruik Node.js 18 Alpine als base image (kleiner en efficiënter)
FROM node:18-alpine

# Installeer benodigde packages voor Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Vertel Puppeteer om de geïnstalleerde Chromium te gebruiken
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Maak app directory
WORKDIR /usr/src/app

# Kopieer package files
COPY package*.json ./

# Installeer dependencies
RUN npm ci --only=production && npm cache clean --force

# Maak non-root user voor security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Kopieer app source code
COPY --chown=nextjs:nodejs . .

# Switch naar non-root user
USER nextjs

# Expose poort 3001
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start de applicatie
CMD ["npm", "start"] 