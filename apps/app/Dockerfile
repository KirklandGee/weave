# Use Node.js 20 alpine image
FROM node:20-alpine

# Install bash and git for debugging and GitHub package installation
RUN apk add --no-cache bash git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use npm install since no package-lock.json)
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]