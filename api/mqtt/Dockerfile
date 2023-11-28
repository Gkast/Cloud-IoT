FROM node:latest

LABEL authors="George Kastanis"

WORKDIR /usr/cloud-iot/mqtt-api

COPY package*.json ./

RUN npm install --silent --no-progress

COPY . .

RUN npm run build

ENTRYPOINT ["node","./dist/main.js"]