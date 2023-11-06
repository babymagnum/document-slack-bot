FROM node:20.5.1-bullseye

RUN apt update
RUN apt install -y \
    g++ \
    build-essential

WORKDIR /app

COPY package*json ./

RUN npm install --production
COPY . .

RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]