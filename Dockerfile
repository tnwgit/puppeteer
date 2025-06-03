# Gebruik Node.js 18 Alpine als base image
FROM node:18-alpine

# Installeer benodigde packages voor Puppeteer en build tools
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    python3 \
    make \
    g++ \
    git

# Vertel Puppeteer om de geïnstalleerde Chromium te gebruiken
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

# Maak app directory
WORKDIR /usr/src/app

# Kopieer package files eerst (voor Docker layer caching)
COPY package*.json ./

# Debug: toon package.json inhoud
RUN cat package.json

# Installeer dependencies met verbose logging
RUN npm install --verbose --production || \
    (echo "npm install failed, trying with legacy peer deps..." && \
     npm install --legacy-peer-deps --production) || \
    (echo "Trying with force flag..." && \
     npm install --force --production)

# Clean npm cache
RUN npm cache clean --force

# Maak non-root user voor security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Kopieer app source code
COPY --chown=nextjs:nodejs . .

# Switch naar non-root user
USER nextjs

# Expose poort 3001
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start de applicatie
CMD ["npm", "start"] 