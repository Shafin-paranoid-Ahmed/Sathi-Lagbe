# MongoDB to PostgreSQL and AWS deployment

This document describes how to migrate the Sathi-Lagbe backend from **MongoDB (Mongoose)** to **PostgreSQL**, and how to **deploy on AWS** in a way that fits **Express + Socket.IO** (long-lived Node, not Lambda-only).

---

## Part 1: MongoDB to PostgreSQL

### Scope in this repository

- **Backend entry**: `server/index.js` uses Mongoose.
- **Models** (~15 files under `server/models/`): User, RideMatch, Chat, Message, Rating, Notification, Routine, Classroom, Friend, FriendStatus, Feedback, Emergency, sosContact, ChatMessage, freeModels.
- **Mongo-heavy patterns**:
  - Document refs and `populate`-style usage.
  - **Embedded subdocuments** (e.g. `RideMatch`: `requestedRiders`, `confirmedRiders`, `recurring`, nested `ratings`).
  - **Aggregation** (e.g. `Rating.getAverageRating`, `getRatingsByCategory`).
- **Redis/cache** (`server/services/cacheService.js` if enabled): unchanged logically; keep cache keys stable if API responses stay the same.
- **Frontend**: No change if REST JSON shapes and URLs stay compatible.

### 1. Choose a Postgres access layer

Pick one and use it consistently:

| Option | Notes |
|--------|--------|
| **Prisma** | Strong migrations, generated client, opinionated. |
| **Drizzle** | Closer to SQL, lightweight. |
| **Knex + SQL** | Full control; more manual work. |

Recommendation: **Prisma or Drizzle** + versioned SQL migrations in the repo.

### 2. Design the relational schema

- **Scalars** → normal columns (`text`, `timestamptz`, `integer`, `boolean`, `numeric`).
- **ObjectIds** → **`uuid`** (cleanest for Postgres) or **`bigint`**; if you must avoid reissuing JWTs/client IDs, keep **string IDs** mapped from Mongo `_id` during migration.
- **Embedded arrays on rides**:
  - **Option A — Normalized**: `rides`, `ride_requests`, `ride_confirmations`, child tables for nested ratings — best integrity and reporting.
  - **Option B — Hybrid**: store volatile subtrees as **`jsonb`** on `rides` — faster port; weaker constraints.

Recreate important **indexes** (see `RideMatch` and other models) as `CREATE INDEX` on columns you filter/sort (`status`, `departure_time`, `rider_id`, etc.).

### 3. Connection and config

- Add **`DATABASE_URL`** (Postgres connection string) in `server/.env` and in deployment secrets (replace or complement `MONGO_URI`).
- Replace Mongoose connect in `server/index.js` with a **single pool** or ORM client; close gracefully on shutdown.

### 4. One-time data migration (ETL)

1. **Export** from MongoDB (`mongoexport` or a Node script using existing Mongoose models).
2. **Transform**: flatten embeds to rows or JSONB; remap all foreign keys to the new PK strategy.
3. **Load**: batched `INSERT` / `COPY` inside transactions.
4. **Verify**: row counts, aggregates vs Mongo (e.g. ratings), spot-check users/rides/chats.

Run against **staging Postgres** first; treat production Mongo as read-only until cutover.

### 5. Rewrite application data access

- Replace every `find` / `save` / `populate` / `aggregate` in **controllers** and **services** with ORM queries or SQL.
- Use **Postgres transactions** for multi-step flows (ride confirm, notifications).
- Reimplement rating analytics as **`GROUP BY`** SQL where it simplifies the old aggregation pipelines.

Keep **routes and response JSON** stable where possible.

### 6. Tests

- Replace **mongodb-memory-server** in `server/tests/setup.js` with a **test Postgres** (Testcontainers, CI service, or Docker).
- Update model tests that assumed Mongoose index APIs.

### 7. Cutover

- **Big bang** (freeze writes → migrate → point app to Postgres) is typical for this app size.
- **Dual-write** is possible but expensive; only if you cannot tolerate a short maintenance window.

### Risks

- **Highest effort**: `RideMatch`-style embedded documents and code that assumes flexible Mongo documents.
- **JWT / client IDs**: keep user **ID strings stable** across migration if you want zero client/token churn.

---

## Part 2: Deploying on AWS

The API is **Express with HTTP + Socket.IO**. That fits **long-lived containers or VMs**, not **Lambda-only** (cold starts, duration limits, awkward WebSocket story).

### Reference architecture

| Layer | AWS service |
|-------|-------------|
| Static React (Vite build) | **S3** + **CloudFront**; TLS with **ACM** (CloudFront cert in `us-east-1`) |
| API + Socket.IO | **ECS on Fargate** (or EC2 / Elastic Beanstalk Docker) behind **Application Load Balancer** |
| PostgreSQL | **RDS for PostgreSQL** in a **VPC** (private subnets); SG allows only app tier |
| Redis (optional) | **ElastiCache for Redis** in same VPC |
| Secrets | **Secrets Manager** or **SSM Parameter Store** for `DATABASE_URL`, `JWT_SECRET`, etc. |
| Images | Keep **Cloudinary** initially, or move uploads to **S3** later |

**Socket.IO at scale**: if you run **more than one** API task, use **ALB sticky sessions** or a **Socket.IO Redis adapter** so a client’s polling/WebSocket hits a consistent backend (or shares room state).

### Simpler options

- **AWS App Runner**: minimal ops; validate WebSocket idle/timeout behavior for chat.
- **Single EC2**: one VM + reverse proxy — good for learning and low traffic.

### Networking and security

- **VPC**: public subnets for ALB; **private** subnets for ECS tasks and RDS (no public DB).
- **Security groups**: least privilege (ALB → ECS only; ECS → RDS/Redis only).
- **IAM**: ECS **task role** to read secrets; avoid long-lived keys on disk.

### CI/CD

- Build a **Docker image** of `server/`, push to **ECR**, deploy **ECS service** with rolling updates.
- Run **DB migrations** as a one-off ECS task or pipeline step before shifting traffic.

### Order of work (Postgres + AWS together)

1. Implement Postgres **schema + app** against **staging RDS** (or local Postgres matching RDS major version).
2. **Containerize** the server (`Dockerfile`, health check).
3. Provision **VPC + RDS + ECS + ALB**; wire secrets; deploy **staging**.
4. Run **ETL**, validate, then cut over DNS / `VITE_API_URL` to production.

### Cost and operations

- RDS, NAT Gateway, and ALB have **baseline monthly cost**; Fargate is usage-based.
- Enable **RDS automated backups**; use **CloudWatch** alarms (ALB 5xx, ECS CPU, RDS connections, free storage).

---

## Related documentation

All project documentation lives under **`doc/`** (see [doc/README.md](./README.md) for an index).
