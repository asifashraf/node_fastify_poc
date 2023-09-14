FROM node:14

ENV PORT=4000
ENV NODE_ENV=production
ENV APOLLO_GRAPH_ID=cofe-server
ENV APOLLO_GRAPH_VARIANT=node-14-docker
ENV APOLLO_KEY=service:cofe-server:f8xK02vtNGDzhqgJJ_05yg
ENV APOLLO_SCHEMA_REPORTING=true
ENV AWS_ACCESS_KEY_ID=AKIAIUMCQWBOP5CFKHRA
ENV AWS_SECRET_ACCESS_KEY=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

WORKDIR /usr/src/app

RUN npm install -g pm2

COPY package.json ./
COPY yarn.lock ./

RUN yarn install

COPY . .

EXPOSE 4000

CMD ["pm2-runtime", "ecosystem.config.js"]
