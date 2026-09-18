# ========================================================
# TN EDU BACKEND - PRODUCTION DOCKERFILE
# ========================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Cài đặt OpenSSL cho Prisma Client
RUN apk add --no-cache openssl libc6-compat

# Copy package.json và cài đặt dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy Prisma schema và sinh mã Prisma Client
COPY prisma ./prisma
RUN npx prisma generate

# Copy mã nguồn JS đã build
COPY dist ./dist

# Tạo thư mục uploads cho file đính kèm
RUN mkdir -p /app/uploads

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "dist/index.js"]
