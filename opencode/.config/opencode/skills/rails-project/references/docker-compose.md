# docker-compose.yml
---

docker-compose file showing how database should be configured for the app

**Important:** Always check for the latest PostgreSQL version before creating the project:
```bash
docker pull postgres:latest
docker images postgres --format "{{.Tag}}" | head -1
```

The values here are just placeholders to exemplify how the file should look like.

```yml
services:
  postgres:
    image: postgres:{{latest-version}}
    ports:
      - "5432:5432"
    volumes:
      - "data:/var/lib/postgresql/data"
    environment:
      POSTGRES_PASSWORD: "my-complex-password"

volumes:
  data: {}
```

This file should be ignored in .gitignore file

```bash
# Ignore docker-compose.yml
/docker-compose.yml
```

To instruct others on how to properly setup the database, we create a docker-compose-example.yml file in the project

```yml
services:
  postgres:
    image: postgres:{{latest-version}}
    ports:
      - "{{config/database.yml:port}}:5432"
    volumes:
      - "data:/var/lib/postgresql/data"
    environment:
      POSTGRES_PASSWORD: "{{config/database.yml:password}}"

volumes:
  data: {}
```
