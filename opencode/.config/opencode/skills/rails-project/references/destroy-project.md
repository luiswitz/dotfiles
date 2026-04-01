# Destroy Rails project

Steps to completely remove an existing Rails app.

## 1. Stop running processes

If using tmuxinator, kill the session:
```bash
tmuxinator stop {{project-name}}
```

## 2. Stop and remove Docker containers

```bash
cd {{project-path}}
docker-compose down -v
```

The `-v` flag removes volumes (database data).

## 3. Remove tmuxinator config

```bash
rm ~/.config/tmuxinator/{{project-name}}.yml
```

## 4. Remove project directory

```bash
rm -rf {{project-path}}
```

## 5. Remove database (if using local PostgreSQL)

If PostgreSQL is running locally (not in Docker), drop the databases:
```bash
dropdb {{project-name}}_development
dropdb {{project-name}}_test
dropdb {{project-name}}_production  # if exists
```
