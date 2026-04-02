FROM nginx:1.27-alpine

RUN rm -rf /etc/nginx/conf.d/* && rm -rf /usr/share/nginx/html/*

COPY index.html /usr/share/nginx/html/index.html
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY assets/ /usr/share/nginx/html/assets/
COPY site-v6-video/robots.txt /usr/share/nginx/html/robots.txt
COPY site-v6-video/sitemap.xml /usr/share/nginx/html/sitemap.xml
COPY site-v6-video/nginx.conf /etc/nginx/conf.d/flowai.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
