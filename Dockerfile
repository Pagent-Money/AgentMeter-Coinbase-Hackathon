# Use Node.js runtime
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built service
COPY static/service.js .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "
    const http = require('http');
    const options = {
      host: 'localhost',
      port: 8080,
      path: '/health',
      timeout: 2000,
    };
    const request = http.request(options, (res) => {
      if (res.statusCode === 200) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    });
    request.on('error', () => process.exit(1));
    request.on('timeout', () => process.exit(1));
    request.end();
  "

# Start the application
CMD ["node", "service.js"]
