FROM nginx:1.27-alpine

# Remove all default nginx configs and html
RUN rm -rf /etc/nginx/conf.d/* && rm -rf /usr/share/nginx/html/*

# Copy site files explicitly
COPY site-v6-video/index.html /usr/share/nginx/html/index.html
COPY site-v6-video/css/ /usr/share/nginx/html/css/
COPY site-v6-video/js/ /usr/share/nginx/html/js/
COPY site-v6-video/robots.txt /usr/share/nginx/html/robots.txt
COPY site-v6-video/sitemap.xml /usr/share/nginx/html/sitemap.xml
COPY site-v6-video/nginx.conf /etc/nginx/conf.d/flowai.conf

# Cache bust
ARG BUILD_DATE=unknown
LABEL build_date=$BUILD_DATE

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
