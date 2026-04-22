# AKS Cluster Setup — ImpulsaEdu

## Overview

The ImpulsaEdu AKS cluster uses two node pools on `Standard_B2s` instances to stay within Azure for Students free credit limits (~$100).

| Node Pool | Mode | SKU | Count (min/max) | Cost/month |
|---|---|---|---|---|
| `system` | System | Standard_B2s | 1 / 2 | ~$30–60 |
| `workloads` | User | Standard_B2s | 1 / 3 | ~$30–90 |

**Standard_B2s spec**: 2 vCPU, 4 GB RAM, burstable — ideal for variable academic workloads.

> Keep the cluster running only when actively developing or demoing. Use `infra/cluster-teardown.sh` to delete the cluster between sessions, then `infra/cluster-setup.sh` to recreate it. The full setup takes ~5 minutes.

---

## Prerequisites

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Install kubectl
az aks install-cli

# Log in with your Azure for Students account
az login
```

---

## Provisioning the Cluster

```bash
# From the repo root
./infra/cluster-setup.sh
```

The script:
1. Creates resource group `rg-impulsaedu` in `eastus`
2. Creates the AKS cluster with the `system` node pool (1–2 nodes)
3. Adds the `workloads` node pool (1–3 nodes)
4. Fetches `kubeconfig` credentials
5. Applies all base manifests under `k8s/base/`
6. Installs ingress-nginx controller (creates an Azure LoadBalancer)
7. Installs cert-manager and applies Let's Encrypt ClusterIssuers
8. Applies the Ingress manifest (`k8s/base/ingress.yaml`)

After the script completes, follow the DNS and TLS steps in [docs/dns-configuration.md](dns-configuration.md).

### Override defaults

```bash
RESOURCE_GROUP=rg-custom CLUSTER_NAME=aks-custom LOCATION=westus ./infra/cluster-setup.sh
```

---

## Verifying Connectivity

```bash
kubectl get nodes -o wide
# NAME                                STATUS   ROLES   AGE   VERSION
# aks-system-xxxxx-vmss000000         Ready    agent   2m    v1.29.x
# aks-workloads-xxxxx-vmss000000      Ready    agent   1m    v1.29.x

kubectl get namespaces
# NAME           STATUS   AGE
# impulsa-dev    Active   1m
# impulsa-prod   Active   1m
```

---

## Namespace Resource Limits

### `impulsa-dev`

| Resource | Request quota | Limit quota |
|---|---|---|
| CPU | 1 core | 2 cores |
| Memory | 2 Gi | 4 Gi |
| Pods | — | 20 |

### `impulsa-prod`

| Resource | Request quota | Limit quota |
|---|---|---|
| CPU | 2 cores | 4 cores |
| Memory | 4 Gi | 8 Gi |
| Pods | — | 30 |

### Default container limits (both namespaces)

| | Request | Limit |
|---|---|---|
| CPU | 100m | 500m |
| Memory | 128 Mi | 512 Mi |

---

## Tearing Down the Cluster

```bash
./infra/cluster-teardown.sh
```

This permanently deletes the cluster and resource group. Run `cluster-setup.sh` again to recreate.

---

## HTTPS Ingress and TLS

The cluster exposes a single public entry point via ingress-nginx with TLS certificates managed by cert-manager (Let's Encrypt).

### Path routing

| Path prefix | Backend service | Auth |
|-------------|----------------|------|
| `/auth` | auth-service (port 8081) | Handled by auth-service |
| `/api/v1` | api-service (port 8080) | JWT enforced by api-service middleware |
| `/` | frontend (port 3000) | None |

### Prerequisites

- `helm` installed locally (`brew install helm` or [helm.sh/docs/intro/install](https://helm.sh/docs/intro/install/))

### TLS certificate issuance

See **[docs/dns-configuration.md](dns-configuration.md)** for the full workflow:
1. Get the LoadBalancer IP assigned to the ingress-nginx service
2. Create a DNS A record pointing your domain to that IP
3. Verify staging certificate issuance
4. Switch to the production Let's Encrypt issuer

---

## Node Pool Design Rationale

- **`system` pool** runs AKS system components (CoreDNS, metrics-server, kube-proxy). It carries the `CriticalAddonsOnly=true:NoSchedule` taint by default, so application pods are never scheduled here.
- **`workloads` pool** is where all application pods (`frontend`, `api-service`, `auth-service`, `postgres`) land. Cluster autoscaler scales this pool between 1 and 3 nodes based on pending pods.
- Both pools use `Standard_B2s` to stay within Azure for Students quota. If quota errors appear during provisioning, request a quota increase in the Azure portal under **Subscriptions → Usage + quotas**.
