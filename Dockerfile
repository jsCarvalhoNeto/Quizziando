# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copia dependências primeiro para aproveitar o cache do Docker
COPY package*.json ./
RUN npm ci

# Copia o restante dos arquivos do projeto
COPY . .

# Compila o frontend Vite diretamente
RUN npm run build

# Stage 2: Imagem final ultra-leve com Nginx
FROM nginx:alpine

# Configuração com suporte a SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos compilados do build
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
