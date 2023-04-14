#!/bin/bash

dockerize -wait tcp://db:5432 -timeout 60s

prisma migrate deploy

npm run start:dev



