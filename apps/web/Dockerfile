FROM node:24-bookworm-slim AS build
WORKDIR /repo
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ARG VITE_API_ORIGIN
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_APP_DOMAIN
ARG VITE_SHIP_MINT
ARG VITE_SOLANA_RPC_URL
ARG VITE_TREASURY_WALLET
ENV VITE_API_ORIGIN=$VITE_API_ORIGIN VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID VITE_APP_DOMAIN=$VITE_APP_DOMAIN VITE_SHIP_MINT=$VITE_SHIP_MINT VITE_SOLANA_RPC_URL=$VITE_SOLANA_RPC_URL VITE_TREASURY_WALLET=$VITE_TREASURY_WALLET
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @ship/web --include-workspace-root --no-audit --no-fund
COPY packages/shared packages/shared
COPY apps/web apps/web
COPY docs docs
COPY tsconfig.base.json ./
RUN npm run build -w @ship/shared && npm run build -w @ship/web

FROM node:24-bookworm-slim
WORKDIR /repo/apps/web
ENV NODE_ENV=production
COPY --from=build /repo/apps/web/dist ./dist
COPY --from=build /repo/apps/web/server.mjs ./server.mjs
COPY --from=build /repo/apps/web/package.json ./package.json
COPY --from=build /repo/node_modules/sirv /repo/node_modules/sirv
COPY --from=build /repo/node_modules/mrmime /repo/node_modules/mrmime
COPY --from=build /repo/node_modules/totalist /repo/node_modules/totalist
COPY --from=build /repo/node_modules/@polka /repo/node_modules/@polka
EXPOSE 8080
CMD ["node", "server.mjs"]
