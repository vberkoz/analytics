FROM golang:1.21-alpine AS builder
WORKDIR /build
COPY . .
RUN CGO_ENABLED=0 go build -o main main.go

FROM public.ecr.aws/lambda/go:1
COPY --from=builder /build/main .
CMD ["main"]
