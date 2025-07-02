# Build backend
FROM golang:1.23-alpine AS backend-build
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
RUN go build -o app

# Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app
# Copy package.json first
COPY frontend/package.json ./
# Copy package-lock.json if it exists
COPY frontend/package-lock.json* ./
# Install dependencies
RUN npm install
# Copy source files
COPY frontend/ .
# Build the frontend
RUN npm run build

# Final image
FROM alpine:latest
# Install ca-certificates for HTTPS requests if needed
RUN apk --no-cache add ca-certificates
WORKDIR /app
# Copy the built backend binary
COPY --from=backend-build /app/app ./app
# Copy the built frontend static files
COPY --from=frontend-build /app/dist ./frontend_dist
# Create data directory for volume mounting
RUN mkdir -p /app/data
# Expose port 8081
EXPOSE 8081
# Run the application
CMD ["./app"] 