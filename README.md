# LEAP AND BOUND

A gamified "study with me" web app where a pet companion grows alongside your focus sessions.
ACCESS THROUGH THIS:
https://pixel-todo-one.vercel.app/

## The story

This started as a side project between me and my girlfriend Sunny, who studies marketing. We wanted a "study with me" product that we'd actually use ourselves, so we built one.

The harder problem wasn't the studying but it was getting people to come back. That's where Sunny ideas shaped the product. We drew heavily on features from apps like **Duolingo** and **Stick-it-with-Robert**: streaks, achievements, and a companion that reacts to your habits, turning a plain timer into something you don't want to break.

I handled the full stack and deployment; she drove the product design, feature wises and growth thinking.

## Tech stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS
- **Backend:** Spring Boot 4, Java 21, Maven
- **Database:** PostgreSQL
- **Infra:** Docker Compose, Nginx as a reverse proxy

## Structure

```
.
├── frontend/          # Next.js 16 + Tailwind + TypeScript
├── backend/           # Spring Boot 4 + Java 21 + Maven
├── nginx/             # Reverse proxy config
├── scripts/           # Deployment helpers (SSL, etc.)
└── docker-compose.yml # Postgres for local dev, backend for easier deployment
```

## Deployment

```bash
# Connect to the database
docker exec -it leap-and-bound-postgres psql -U studyfarm -d studyfarm

# Provision SSL certificates
DOMAIN=your-domain.example EMAIL=you@example.com ./scripts/init-letsencrypt.sh
```
