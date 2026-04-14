# GKE Infrastructure – ImpulsaEdu

## Architecture Overview

```
Internet
   │
   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        GKE Cluster                                  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  NGINX Ingress + GKE Managed TLS Certificate                 │  │
│  └──────────────┬────────────────┬────────────────┬─────────────┘  │
│                 │/               │/api/*           │/auth/*         │
│                 ▼                ▼                 ▼                │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐       │
│  │   frontend   │  │   api-service   │  │   auth-service   │       │
│  │  (Next.js)   │  │ (Fastify/Node)  │  │  (Fastify/Node)  │       │
│  │  :3000 ×2   │  │  :8080  ×2     │  │   :8081 ×2      │       │
│  │  HPA 2→5    │  │  HPA 2→5       │  │                  │       │
│  └──────────────┘  └────────┬────────┘  └────────┬─────────┘       │
│                             │                     │                 │
│                             └──────────┬──────────┘                 │
│                                        ▼                            │
│                             ┌─────────────────┐                     │
│                             │    postgres      │  (or Cloud SQL)    │
│                             │  :5432 ×1       │                     │
│                             │  StatefulSet     │                     │
│                             │  PVC 10Gi        │                     │
│                             └─────────────────┘                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Namespaces

| Namespace | Branch | Purpose |
|---|---|---|
| `impulsa-dev` | `develop` | Continuous integration deploys |
| `impulsa-prod` | `main` | Production workloads |

---

## Kubernetes Objects Summary

| Service | Kind | Replicas | HPA |
|---|---|---|---|
| `frontend` | Deployment | 2 | 2–5 (CPU 70%) |
| `api-service` | Deployment | 2 | 2–5 (CPU 70%) |
| `auth-service` | Deployment | 2 | — |
| `postgres` | StatefulSet | 1 | — |

---

## Resource Limits

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---|---|---|---|---|
| `frontend` | 100m | 500m | 256Mi | 512Mi |
| `api-service` | 100m | 500m | 256Mi | 512Mi |
| `auth-service` | 100m | 300m | 128Mi | 256Mi |
| `postgres` | 250m | 1000m | 512Mi | 1Gi |
| **Total (min)** | **550m** | **2300m** | **1152Mi** | **2304Mi** |

---

## Recommended Node Pools

### System Node Pool
Runs GKE system components (kube-system).

| Parameter | Value |
|---|---|
| Machine type | `e2-medium` (2 vCPU, 4 GB) |
| Nodes | 1 (autoscale 1–2) |
| Taints | `CriticalAddonsOnly=true:NoSchedule` |

### Workloads Node Pool
Runs all ImpulsaEdu pods.

| Parameter | Value |
|---|---|
| Machine type | `e2-standard-2` (2 vCPU, 8 GB RAM) |
| Nodes | 2 (autoscale 2–4) |
| Disk size | 50 GB SSD |

**Why `e2-standard-2`?** The minimum resource requests total ~550m CPU and ~1.2 GB RAM. With 2 nodes × 2 vCPU you get 4 vCPU and 16 GB RAM — enough headroom for HPA scale-out bursts and rolling updates without OOM evictions.

---

## TLS Strategy

- **GKE Managed Certificates** (`networking.gke.io/v1 ManagedCertificate`) automatically provision and renew Let's Encrypt certs for the configured domain.
- The Ingress annotation `networking.gke.io/managed-certificates: impulsa-cert` binds the cert.
- NGINX Ingress enforces `ssl-redirect: "true"` — all HTTP traffic is redirected to HTTPS.

---

## Secrets Management

Kubernetes Secrets are **not** stored in this repository. Two options:

### Option A – GCP Secret Manager + External Secrets Operator (recommended for production)
```bash
# Store in GCP Secret Manager
gcloud secrets create impulsa-jwt-secret --data-file=- <<< "your-secret"

# External Secrets Operator syncs them into K8s Secrets automatically
```

### Option B – kubectl (quickstart)
```bash
kubectl create secret generic impulsa-secrets \
  --from-literal=POSTGRES_USER=impulsa \
  --from-literal=POSTGRES_PASSWORD=<password> \
  --from-literal=JWT_SECRET=<jwt-secret> \
  --from-literal=POSTGRES_HOST=<host-or-cloud-sql-ip> \
  --namespace=impulsa-prod
```

The file `k8s/base/secrets.template.yaml` documents the required keys — **never commit a file with real values**.

---

## PostgreSQL: StatefulSet vs Cloud SQL

| | StatefulSet (in-cluster) | Cloud SQL (managed) |
|---|---|---|
| Setup time | Included in manifests | ~10 min via GCP console |
| Backups | Manual or Velero | Automatic |
| HA / failover | Manual | Automatic |
| Ops burden | Higher | Lower |
| **Recommendation** | Dev / quick demo | **Production** |

For production, set `POSTGRES_HOST` in the Secret to the Cloud SQL private IP and remove the `postgres/` manifests from the overlay's `kustomization.yaml`.

---

## CI/CD Pipeline

See [`.github/workflows/deploy-gke.yml`](../.github/workflows/deploy-gke.yml).

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `GCP_PROJECT_ID` | GCP project ID |
| `GCP_REGION` | Region (e.g. `us-central1`) |
| `GKE_CLUSTER` | GKE cluster name |
| `GKE_REGION` | GKE cluster region or zone |
| `GCP_WIF_PROVIDER` | Workload Identity Federation provider resource name |
| `GCP_SERVICE_ACCOUNT` | Service account email for CI/CD |

### Flow

```
push → develop                    push → main
       │                                 │
       ▼                                 ▼
  Build images                    Build images
  Push :dev tag                   Push :latest + :SHA
       │                                 │
       ▼                                 ▼
  kustomize build                 kustomize build
  overlays/dev                    overlays/prod
       │                                 │
       ▼                                 ▼
  kubectl apply                   kubectl apply
  (impulsa-dev)                   (impulsa-prod)
```

---

## Health & Readiness Probes

All services expose a `GET /health` endpoint (returning HTTP 200) used by both probes.

| Service | Liveness | Readiness |
|---|---|---|
| `frontend` | `GET /api/health` | `GET /api/health` |
| `api-service` | `GET /health` | `GET /health` |
| `auth-service` | `GET /health` | `GET /health` |
| `postgres` | `pg_isready` exec | `pg_isready` exec |

---

## Directory Structure

```
k8s/
├── base/
│   ├── kustomization.yaml
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.template.yaml       ← template only, no real values
│   ├── frontend/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── hpa.yaml
│   ├── api-service/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── hpa.yaml
│   ├── auth-service/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── postgres/
│   │   ├── statefulset.yaml
│   │   └── service.yaml
│   └── ingress/
│       ├── ingress.yaml
│       └── managed-cert.yaml
└── overlays/
    ├── dev/
    │   └── kustomization.yaml      ← 1 replica, :dev image tag
    └── prod/
        └── kustomization.yaml      ← 2 replicas, :latest image tag
```
