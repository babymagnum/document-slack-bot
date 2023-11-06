FROM node:20.5.1-bullseye

RUN apt update
RUN apt install -y \
    g++ \
    build-essential

WORKDIR /app

ENV NODE_ENV=production

COPY package*json ./

COPY tsconfig*json ./

RUN npm install --production
RUN npm install -g typescript
RUN npm install -g tsc --force

COPY . .

RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]