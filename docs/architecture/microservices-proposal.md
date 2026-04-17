# ImpulsaEdu – Microservices Architecture Proposal

> **Scope reminder**: 6-week academic MVP. All decisions prioritize delivery speed and maintainability over sophistication.

---

## 1. Service Topology

Four containers. No more, no less.

```
                         ┌─────────────────────────────────────────────────────┐
                         │                  AKS Cluster                        │
                         │                                                     │
 Browser ───────────────►│  ┌─────────────┐   ┌─────────────┐                  │
                         │  │  Ingress /  │──►│  frontend   │  Next.js 14      │
                         │  │  Load       │   │  :3000      │  (SSR + SPA)     │
                         │  │  Balancer   │   └─────────────┘                  │
                         │  │  (NGINX)    │                                    │
                         │  │             │──►┌─────────────┐                  │
                         │  └─────────────┘   │ api-service │  Node.js/TS      │
                         │                    │  :8080      │──────────────┐   │
                         │                    └─────────────┘              │   │
                         │                                                 │   │
                         │                    ┌─────────────┐              │   │
                         │                    │auth-service │  Node.js/TS  │   │
                         │                    │  :8081      │──────────────┤   │
                         │                    └─────────────┘              │   │
                         │                                                  ▼  │
                         │                                    ┌─────────────┐  │
                         │                                    │  postgres   │  │
                         │                                    │  :5432      │  │
                         │                                    └─────────────┘  │
                         └─────────────────────────────────────────────────────┘
```

### Service Responsibilities

| Service | Image | Responsibility |
|---|---|---|
| `frontend` | `node:20-alpine` + Next.js | Public SSR dashboard (schools catalog); admin SPA (all CRUD); JWT stored in `httpOnly` cookie |
| `api-service` | `node:20-alpine` | All business logic: schools, donors, donations, workflow, progress bar, reports. Validates JWT via shared secret. |
| `auth-service` | `node:20-alpine` | Login, JWT issuance (access + refresh), logout, user management basics |
| `postgres` | `postgres:16-alpine` | Single PostgreSQL instance with all tables. Mounted persistent volume in GKE. |

---

## 2. Technology Stack

| Layer | Decision | Rationale |
|---|---|---|
| Frontend framework | Next.js 14 (App Router) | SSR for public dashboard; easy protected routes for admin panel |
| Frontend language | TypeScript | Type safety, good IDE support |
| Frontend styling | Tailwind CSS | Fast, consistent UI; matches mockup visual simplicity |
| Backend runtime | Node.js 20 (LTS) | Unified JS/TS stack across all services; single language for the whole team |
| Backend framework | **Fastify** (api-service + auth-service) | Faster than Express, first-class TypeScript support, schema validation built-in; Express is a viable drop-in if team prefers it |
| Backend language | TypeScript | Shared type definitions possible across services; catches contract bugs at compile time |
| ORM / query builder | **Drizzle ORM** | Lightweight, TypeScript-native, generates raw SQL — easy to reason about and debug |
| Auth mechanism | JWT (HS256) — access + refresh tokens | Stateless, simple to implement; no session store needed |
| Database | PostgreSQL 16 | Relational integrity crucial for donations ↔ donors ↔ schools; familiar, well-supported |
| Container orchestration | Azure Kubernetes Service (AKS) | As specified |
| Ingress | NGINX Ingress Controller | Routes `/api/*` → api-service, `/auth/*` → auth-service, `/*` → frontend |
| CI/CD | GitHub Actions | Automated test + build + deploy pipeline |

---

## 3. Communication Pattern

All inter-service communication is **synchronous REST over HTTP**. No message queue needed at this scope.

```
Browser
  │
  ├─── POST /auth/login  ────────────────────► auth-service
  │        ◄── { access_token, refresh_token }
  │
  ├─── GET /api/v1/schools  ─────────────────► api-service
  │    (public, no auth)       validates JWT   (shared JWT_SECRET env var)
  │
  ├─── POST /api/v1/donations  ──────────────► api-service
  │    Bearer: <access_token>                    │
  │                                              ▼
  │                                          postgres
```

**JWT validation strategy**: `api-service` validates tokens locally using `JWT_SECRET` loaded from a Kubernetes Secret. There is **no inter-service call per request** — this keeps latency low and avoids a synchronous dependency on `auth-service` for every API call.

---

## 4. Public vs. Admin Routing

The NGINX Ingress splits traffic by path prefix:

| Path prefix | Backend service | Auth required |
|---|---|---|
| `/auth/*` | auth-service | No (login endpoint) |
| `/api/v1/schools` (GET) | api-service | No (public read) |
| `/api/v1/*` (all other) | api-service | Yes — Bearer JWT |
| `/*` | frontend | No (Next.js handles its own route protection) |

The Next.js admin panel (`/admin/*`) verifies the JWT cookie client-side via middleware redirects. The public dashboard (`/`) fetches school data server-side with no auth.

---

## 5. Domain Model Overview

Six entities. See [database-schema.md](database-schema.md) for full DDL.

```
users
  └──< donations (created_by)
  └──< schools   (created_by)
  └──< donors    (created_by)

schools 1──< donations
donors  1──< donations
donations 1──1 deliveries
        └──< audit_logs (entity_id)

refresh_tokens >──1 users
```

---

## 6. Workflow State Machine

Valid transitions enforced at the API layer (Node.js), **not** at the database layer:

```
registered ──► approved ──► in_delivery ──► delivered ──► completed
     │              │              │
     └──────────────┴──────────────┴──────────────────────► cancelled
```

Illegal transitions return `HTTP 422 Unprocessable Entity` with a descriptive error.

---

## 7. Progress Bar Calculation

Computed on-the-fly by the `api-service` — no materialized column (avoids sync issues):

```sql
SELECT
  s.id,
  s.funding_goal,
  COALESCE(SUM(
    CASE
      WHEN d.type = 'monetary'  THEN d.amount
      WHEN d.type = 'material'  THEN d.estimated_value
      ELSE 0
    END
  ), 0) AS confirmed_value
FROM schools s
LEFT JOIN donations d
  ON d.school_id = s.id
  AND d.state IN ('approved','in_delivery','delivered','completed')
GROUP BY s.id, s.funding_goal;
```

`progress_pct = confirmed_value / funding_goal * 100`

---

## 8. AKS Deployment Model

### Kubernetes Objects per Service

```
api-service:
  Deployment (replicas: 2)
  Service (ClusterIP)
  HorizontalPodAutoscaler (min:2, max:5 — optional for MVP)

auth-service:
  Deployment (replicas: 2)
  Service (ClusterIP)

frontend:
  Deployment (replicas: 2)
  Service (ClusterIP)

postgres:
  StatefulSet (replicas: 1 for MVP — or use Azure Database for PostgreSQL)
  Service (ClusterIP)
  PersistentVolumeClaim (10Gi)

Shared:
  Ingress (NGINX)
  ConfigMap (non-secret env vars)
  Secret (DB_PASSWORD, JWT_SECRET)
  Namespace: impulsa-prod / impulsa-dev
```

### Recommended: Azure Database for PostgreSQL instead of StatefulSet
For a 6-week academic project deployed to AKS, **Azure Database for PostgreSQL (Flexible Server)** is preferable to running PostgreSQL in a pod. It eliminates backup management, provides automatic failover, and takes 10 minutes to set up.

---

## 9. Environments

| Environment | Namespace | Notes |
|---|---|---|
| `dev` | `impulsa-dev` | Deployed on every push to `develop` branch |
| `prod` | `impulsa-prod` | Deployed on push/tag to `main` after tests pass |

---

## 10. Security Checklist

- [ ] HTTPS enforced via cert-manager or Azure-managed certificate
- [ ] JWT `exp` set to 15 minutes (access) / 7 days (refresh)
- [ ] `httpOnly`, `Secure`, `SameSite=Strict` cookie flags on frontend
- [ ] All mutations require JWT with appropriate role
- [ ] Input validation runs server-side in `api-service`
- [ ] Passwords hashed with `bcrypt` (cost ≥ 12)
- [ ] DB credentials injected via Kubernetes Secrets (never in image)
- [ ] Audit log written for every state transition and CRUD operation

---

## 11. Decisions Still Open

| Decision | Options | Recommendation |
|---|---|---|
| Backend framework | Fastify vs Express | **Fastify** — better performance and built-in schema validation; Express if team is more familiar |
| ORM depth | Drizzle vs plain `pg` queries | **Drizzle** — type-safe with minimal overhead; raw `pg` if team prefers full SQL control |
| Monorepo structure | Separate repos vs pnpm workspaces monorepo | **pnpm workspaces** — share TypeScript types between frontend, api-service, and auth-service without duplication |
| PostgreSQL hosting | Azure Database for PostgreSQL vs StatefulSet in AKS | **Azure Database for PostgreSQL (Flexible Server)** — reduces ops burden significantly |
| Export format (reports) | CSV only vs CSV+PDF | **CSV only** for MVP; PDF is scope risk |
| Refresh token storage | DB table vs Redis | **DB table** (refresh_tokens) — avoids adding another service |
