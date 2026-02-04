FROM node:20-alpine

WORKDIR /usr/src/app

# Install dependencies, utilizing caching
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Install curl for healthcheck
RUN apk --no-cache add curl

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN pnpm build

# Expose port
EXPOSE 3000

# Start application
CMD ["pnpm", "start:prod"]
