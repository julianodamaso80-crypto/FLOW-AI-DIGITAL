FROM nginx:1.27-alpine

RUN rm -rf /etc/nginx/conf.d/* && rm -rf /usr/share/nginx/html/*

# Copy all site files from site-v6-video
COPY site-v6-video/index.html /usr/share/nginx/html/index.html
COPY site-v6-video/css/ /usr/share/nginx/html/css/
COPY site-v6-video/js/ /usr/share/nginx/html/js/
COPY site-v6-video/assets/ /usr/share/nginx/html/assets/
COPY site-v6-video/robots.txt /usr/share/nginx/html/robots.txt
COPY site-v6-video/sitemap.xml /usr/share/nginx/html/sitemap.xml
COPY favicon.svg /usr/share/nginx/html/favicon.svg

# Copy blog and internal pages
COPY site-v6-video/blog/ /usr/share/nginx/html/blog/
COPY site-v6-video/clinicas-odontologicas/ /usr/share/nginx/html/clinicas-odontologicas/
COPY site-v6-video/clinicas-esteticas/ /usr/share/nginx/html/clinicas-esteticas/
COPY site-v6-video/imobiliarias/ /usr/share/nginx/html/imobiliarias/
COPY site-v6-video/sobre/ /usr/share/nginx/html/sobre/
COPY site-v6-video/diagnostico-de-receita/ /usr/share/nginx/html/diagnostico-de-receita/
COPY site-v6-video/casos/ /usr/share/nginx/html/casos/
COPY site-v6-video/privacidade/ /usr/share/nginx/html/privacidade/
COPY site-v6-video/termos/ /usr/share/nginx/html/termos/

# Nginx config
COPY site-v6-video/nginx.conf /etc/nginx/conf.d/flowai.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
