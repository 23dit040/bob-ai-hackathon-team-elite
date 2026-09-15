FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

ENV NODE_ENV=production
ENV MCP_TRANSPORT=sse

EXPOSE 3002

CMD ["node", "dist/index.js"]
