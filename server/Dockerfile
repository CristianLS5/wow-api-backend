FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Add specific copy for CSV files to ensure they're in the right place after build
COPY ./src/data/csv ./dist/data/csv

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
