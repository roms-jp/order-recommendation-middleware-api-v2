FROM node:16.14.0

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install
#RUN npm ci --only=production

COPY . .

EXPOSE 8080

CMD [ "npm", "run", "order:recommendation:api"]
