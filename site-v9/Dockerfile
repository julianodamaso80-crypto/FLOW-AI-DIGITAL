# ============================================================
# FlowAI Digital — site-v9 (LP cinematográfica com rolagem 3D)
# Next.js export estático + nginx, seguindo o mesmo padrão de
# Dockerfile.v8: build em um estágio, serve em outro, sem backend.
# ============================================================

# ---- Estágio 1: build do site Next.js ----
FROM node:20-alpine AS builder
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . ./
RUN npm run build
# resultado: /build/out (site estático)

# ---- Estágio 2: nginx servindo o export estático ----
FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /build/out/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
