FROM mcr.microsoft.com/playwright:focal
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install
RUN npx playwright install chromium

COPY . .

CMD yarn back
