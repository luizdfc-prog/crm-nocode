FROM node:20-slim

# Dependências nativas do Baileys (canvas, sharp, etc.)
RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]
