FROM nginx:1.25-alpine

WORKDIR /usr/share/nginx/html

COPY index.html ./
COPY src ./src
COPY img ./img
COPY vendor ./vendor
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
