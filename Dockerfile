FROM node:18-alpine

# App directory
WORKDIR /app

# Copy ONLY package.json (No lockfile)
COPY package.json ./

# Install dependencies (ignoring lockfile)
RUN npm install --omit=dev

# Copy rest of the app
COPY . .

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Start bot
CMD ["node", "index.js"]
