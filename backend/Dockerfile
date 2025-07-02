FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
COPY . .
RUN go mod tidy
RUN go build -o backend

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/backend ./backend
EXPOSE 8080
CMD ["./backend"] 