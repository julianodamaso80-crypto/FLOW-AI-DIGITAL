FROM node:20-alpine

# Install nginx + chromium for PDF generation
RUN apk add --no-cache \
    nginx \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto \
    font-noto-extra

# Puppeteer config — use system chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Clean default nginx
RUN rm -rf /etc/nginx/http.d/* && rm -rf /usr/share/nginx/html/*

# Copy static site
COPY site-v7/index.html /usr/share/nginx/html/index.html
COPY site-v7/css/ /usr/share/nginx/html/css/
COPY site-v7/js/ /usr/share/nginx/html/js/
COPY site-v7/assets/ /usr/share/nginx/html/assets/
COPY site-v7/robots.txt /usr/share/nginx/html/robots.txt
COPY site-v7/sitemap.xml /usr/share/nginx/html/sitemap.xml
COPY site-v7/assets/favicon.svg /usr/share/nginx/html/favicon.svg

# Nginx config
COPY site-v7/nginx.conf /etc/nginx/http.d/flowai.conf

# Copy and install API
COPY api/package.json api/package-lock.json* /app/api/
WORKDIR /app/api
RUN npm install --production 2>/dev/null || npm install --production --legacy-peer-deps
COPY api/ /app/api/

# Create reports directory
RUN mkdir -p /app/api/reports

# Copy start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

CMD ["/start.sh"]
