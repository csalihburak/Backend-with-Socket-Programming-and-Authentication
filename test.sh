#!/bin/bash

# Wait for the database to be ready
dockerize -wait tcp://db:5432 -timeout 60s

prisma migrate deploy
# Run the migration
npm run start:dev



