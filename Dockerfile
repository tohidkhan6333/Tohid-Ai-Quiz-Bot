FROM node:18-alpine

# App directory create karo
WORKDIR /app

# Sirf package.json copy karo (lockfile hata di hai humne)
COPY package.json ./

# Dependencies install karo (npm ci ki jagah npm install)
RUN npm install --omit=dev

# Baaki code copy karo
COPY . .

# Security: Non-root user create karo
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Bot start karo
CMD ["node", "index.js"]

