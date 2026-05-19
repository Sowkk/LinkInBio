# Build stage — compile React app into static files
# WHY two stages? Build tools (node_modules ~500MB) are only needed to build
# Final image only needs the built files, not the build tools
FROM node:20-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# WHY VITE_API_URL?
# In production, backend won't be localhost:8000 anymore
# This environment variable tells React where the backend lives
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build
# After this step, /app/dist has our compiled React app — just HTML, CSS, JS files

# Serve stage — serve static files with nginx
# nginx is a lightweight web server — perfect for serving static files
FROM nginx:alpine

# Copy built files to nginx's serving directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
