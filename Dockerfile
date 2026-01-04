# Tohid AI Quiz Bot - Dockerfile
# Created by Tohid

# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Create necessary directories
RUN mkdir -p logs data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV LOG_LEVEL=info

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:${PORT}/health', (res) => { if (res.statusCode === 200) process.exit(0); else process.exit(1); })"

# Start the application
CMD ["npm", "start"]

# Labels
LABEL maintainer="Tohid <tohid@example.com>"
LABEL version="3.0.0"
LABEL description="Tohid AI Quiz Bot - AI-powered Telegram Quiz Bot"
LABEL org.opencontainers.image.source="https://github.com/Tohidkhan6332/Tohid-AI-Quiz-Bot"