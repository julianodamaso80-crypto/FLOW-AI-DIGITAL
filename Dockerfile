FROM nginx:1.27-alpine

RUN rm -rf /etc/nginx/conf.d/* && rm -rf /usr/share/nginx/html/*

# Copy site v7 (nova identidade — unica versao)
COPY site-v7/index.html /usr/share/nginx/html/index.html
COPY site-v7/css/ /usr/share/nginx/html/css/
COPY site-v7/js/ /usr/share/nginx/html/js/
COPY site-v7/assets/ /usr/share/nginx/html/assets/
COPY site-v7/robots.txt /usr/share/nginx/html/robots.txt
COPY site-v7/sitemap.xml /usr/share/nginx/html/sitemap.xml
COPY site-v7/assets/favicon.svg /usr/share/nginx/html/favicon.svg

# Nginx config
COPY site-v7/nginx.conf /etc/nginx/conf.d/flowai.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
