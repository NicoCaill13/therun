# -------- base --------
  FROM node:24-alpine AS base
  WORKDIR /usr/src/app
  ENV PNPM_HOME=/usr/local/bin
  RUN apk add --no-cache bash curl
  # si tu utilises pnpm, tu peux l’installer ici ; sinon npm suffit
  
  # -------- dev --------
  FROM base AS dev
  # manifests + schéma Prisma (postinstall exécute prisma generate)
  COPY package.json package-lock.json* ./
  COPY prisma/schema.prisma prisma/schema.prisma
  RUN npm ci
  # fichiers de conf utiles à Nest en dev
  COPY nest-cli.json tsconfig.json tsconfig.build.json ./
  # le code sera monté par le bind mount via docker-compose
  EXPOSE 3000
  CMD ["sh","-c","npx prisma generate && npm run start:dev"]
  
  # -------- prod --------
  FROM base AS build
  COPY package.json package-lock.json* ./
  COPY prisma/schema.prisma prisma/schema.prisma
  RUN npm ci
  COPY . .
  RUN npx prisma generate && npm run build
  
  FROM node:24-alpine AS prod
  WORKDIR /usr/src/app
  ENV NODE_ENV=production
  COPY --from=build /usr/src/app/node_modules ./node_modules
  COPY --from=build /usr/src/app/dist ./dist
  COPY --from=build /usr/src/app/prisma ./prisma
  EXPOSE 3000
  CMD ["node","dist/main.js"]