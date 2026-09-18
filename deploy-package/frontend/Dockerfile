# ========================================================
# TN EDU FRONTEND - PRODUCTION DOCKERFILE
# ========================================================
FROM nginx:alpine AS runner

# Xóa cấu hình mặc định của nginx
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copy toàn bộ file tĩnh Angular đã build vào nginx
COPY dist/ /usr/share/nginx/html/

# Copy cấu hình nginx tùy chỉnh với reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
