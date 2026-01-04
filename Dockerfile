FROM node:18-alpine

# App directory
WORKDIR /app

# Copy dependency files first (cache friendly)
COPY package.json package-lock.json ./

# Install ONLY production deps
RUN npm ci --omit=dev

# Copy rest of the app
COPY . .

# Non-root user (security best practice)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Start bot
CMD ["node", "index.js"]
