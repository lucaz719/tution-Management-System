FROM node:20-alpine AS build

RUN apk add --no-cache openssl

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui-login/package.json packages/ui-login/package.json
COPY services/api/package.json services/api/package.json
RUN npm ci

COPY packages/types packages/types
COPY services/api services/api
RUN npm run build --workspace @tms/types \
    && npm run prisma:generate --workspace @tms/api \
    && npm run build --workspace @tms/api

FROM node:20-alpine AS runtime

RUN apk add --no-cache openssl

ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/packages/types packages/types
COPY --from=build /app/services/api/package.json services/api/package.json
COPY --from=build /app/services/api/node_modules services/api/node_modules
COPY --from=build /app/services/api/dist services/api/dist
COPY --from=build /app/services/api/prisma services/api/prisma
COPY --from=build /app/services/api/public services/api/public

WORKDIR /app/services/api
EXPOSE 3001
CMD ["node", "dist/server.js"]
