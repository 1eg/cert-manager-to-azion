FROM node:10.12

WORKDIR /home/node

COPY src ./src
COPY package.json .
COPY package-lock.json .
COPY tsconfig.json .

RUN npm i && \
    npm run build

ENTRYPOINT ["node", "lib/index.js"]