FROM nginx:alpine

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy site files
COPY flowai-site-v2.html /usr/share/nginx/html/index.html
COPY logoflow-web.png /usr/share/nginx/html/logoflow-web.png

# Custom nginx config for SPA and performance
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
