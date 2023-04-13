# Specify the base image
FROM ubuntu:22.10

RUN apt update 
RUN apt -y install curl

RUN curl -sL https://deb.nodesource.com/setup_lts.x | bash -
RUN apt-get install -y nodejs
RUN apt-get update && apt-get install -y wget
RUN wget https://github.com/jwilder/dockerize/releases/download/v0.6.1/dockerize-linux-amd64-v0.6.1.tar.gz \
    && tar -C /usr/local/bin -xzvf dockerize-linux-amd64-v0.6.1.tar.gz \
    && rm dockerize-linux-amd64-v0.6.1.tar.gz


RUN npm install -g npm@latest

RUN npm install --global --unsafe-perm prisma

WORKDIR /app

COPY . .

RUN npm install

RUN chmod +x test.sh

ENTRYPOINT [ "./test.sh"]

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
