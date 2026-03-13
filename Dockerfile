FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
COPY logoflow-web.png /usr/share/nginx/html/logoflow-web.png
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
