# Meowdow Study Farm

A pixel-art study room with a cat companion. Frontend in Next.js, backend in Spring Boot.

## Structure

```
.
├── frontend/          # Next.js 16 + Tailwind + TypeScript
├── backend/           # Spring Boot 4 + Java 21 + Maven (Web, JPA, Postgres, Lombok)
└── docker-compose.yml # Postgres for local dev
```

## Run everything locally

### 1. Start Postgres

```bash
docker compose up -d
```

### 2. Backend (`:8080`)

```bash
cd backend
./mvnw spring-boot:run
```

Health check: http://localhost:8080/api/health

### 3. Frontend (`:3000`)

```bash
cd frontend
npm run dev
```

Open http://localhost:3000.

## Notes

- CORS is configured in [backend/src/main/java/com/meowdow/studyfarm/WebConfig.java](backend/src/main/java/com/meowdow/studyfarm/WebConfig.java) to accept requests from `http://localhost:3000`.
- DB credentials live in [backend/src/main/resources/application.properties](backend/src/main/resources/application.properties) — change them for production via env vars or a profile.
- The Postgres data volume `studyfarm-pgdata` persists between `docker compose down/up`. Use `docker compose down -v` to wipe.
# pixel-todo


docker exec -it leap-and-bound-postgres psql -U studyfarm -d studyfarm
DOMAIN=47.130.126.2.sslip.io EMAIL=vietthanh@gmail.com ./scripts/init-letsencrypt.sh