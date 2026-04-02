FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy site-v6-video files
COPY site-v6-video/ /usr/share/nginx/html/

# Copy nginx config
COPY site-v6-video/nginx.conf /etc/nginx/conf.d/flowai.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
