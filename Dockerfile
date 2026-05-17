# --- builder ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# --- runtime ---
FROM nginx:1.27-alpine AS runtime
LABEL org.opencontainers.image.source="https://github.com/onurnafiguzel/ChangeBody"
LABEL org.opencontainers.image.description="ChangeBody Frontend (React + Vite)"
LABEL org.opencontainers.image.licenses="MIT"
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
