# ImpulsaEdu — Infrastructure

This directory contains scripts to provision and tear down the AKS cluster used for ImpulsaEdu.

| File | Purpose |
|---|---|
| `cluster-setup.sh` | Provision the resource group, ACR, AKS cluster, Helm charts, and base manifests |
| `cluster-teardown.sh` | Delete the cluster and resource group to stop credit consumption |
| `issues_encountered` | Raw notes on problems hit during the first real provisioning run |

> The cluster costs ~$90/month at minimum size. Tear it down between development sessions and recreate it when needed — the full setup takes ~10 minutes.

---

## Prerequisites

```bash
# Azure CLI
# On Arch Linux, see Troubleshooting #1 before installing
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash   # Debian/Ubuntu
# yay -S azure-cli                                         # Arch (but read issue #1 first)

# kubectl
az aks install-cli

# Helm
# https://helm.sh/docs/intro/install/
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Log in
az login
```

---

## Provisioning

```bash
# From the repo root
./infra/cluster-setup.sh
```

The script performs the following steps in order:

1. Creates resource group `rg-impulsaedu` in `mexicocentral`
2. Creates Azure Container Registry `acrimpulsaedu` (Basic SKU)
3. Creates the AKS cluster with a `system` node pool (1–2 × Standard_B2s)
4. Adds the `workloads` user node pool (1–3 × Standard_B2s)
5. Fetches `kubeconfig` credentials
6. Applies base manifests: namespaces, resource quotas, limit ranges
7. Installs ingress-nginx via Helm (creates an Azure LoadBalancer)
8. Installs cert-manager via Helm and applies Let's Encrypt ClusterIssuers
9. Applies `k8s/base/ingress.yaml`

### Override defaults via environment

```bash
set -a && source .env && set +a && ./infra/cluster-setup.sh
```

Example `.env`:

```bash
RESOURCE_GROUP=rg-impulsaedu
CLUSTER_NAME=aks-impulsaedu
LOCATION=mexicocentral
KUBERNETES_VERSION=1.29.9   # pin a specific patch version
ACR_NAME=acrimpulsaedu
SYSTEM_NODE_SKU=Standard_B2s
WORKLOADS_NODE_SKU=Standard_B2s
```

### GitHub Actions secrets (required for CI/CD)

After the ACR is created the script prints the values to set. Create a service principal and store these in your repository secrets:

```bash
az ad sp create-for-rbac \
  --name sp-impulsaedu-github \
  --role contributor \
  --scopes /subscriptions/<SUB_ID>/resourceGroups/rg-impulsaedu \
  --sdk-auth
```

| Secret | Value |
|---|---|
| `AZURE_CREDENTIALS` | JSON output of the command above |
| `ACR_LOGIN_SERVER` | printed by the script |
| `AZURE_RESOURCE_GROUP` | `rg-impulsaedu` |
| `AKS_CLUSTER_NAME` | `aks-impulsaedu` |

---

## Post-setup: DNS and TLS

After the script finishes, configure DNS and TLS following [docs/dns-configuration.md](../docs/dns-configuration.md). The short version:

```bash
# 1. Get the LoadBalancer IP
kubectl get svc ingress-nginx-controller -n ingress-nginx \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}{"\n"}'

# 2. Create an A record: app.impulsaedu.com -> <LoadBalancer IP>

# 3. Watch staging certificate issuance
kubectl describe certificate impulsa-tls -n impulsa

# 4. Once staging succeeds, switch the cluster-issuer in k8s/base/ingress.yaml
#    to letsencrypt-prod and re-apply
```

---

## Tearing Down

```bash
./infra/cluster-teardown.sh
```

You will be prompted to type the cluster name to confirm. This deletes the entire resource group and cannot be undone.

---

## Verifying the Cluster

```bash
kubectl get nodes -o wide
kubectl get namespace impulsa
kubectl describe resourcequota -n impulsa
kubectl get clusterissuer
kubectl get svc ingress-nginx-controller -n ingress-nginx
```

---

## Troubleshooting

### 1. Arch Linux — Azure CLI incompatible with Python 3.14

As of April 2026, the `azure-cli` Arch package uses the system Python, which is 3.14.x. The CLI does not support 3.14 yet. Fix: rebuild its venv against Python 3.12.

**Option A — AUR python312:**

```bash
yay -S python312
sudo python3.12 -m venv /opt/azure-cli --clear
sudo /opt/azure-cli/bin/pip install azure-cli

# Verify
/opt/azure-cli/bin/python --version   # should print 3.12.x
az --version
```

**Option B — pyenv:**

```bash
pyenv install 3.12
sudo /home/<user>/.pyenv/versions/3.12.13/bin/python3.12 -m venv /opt/azure-cli --clear
sudo /opt/azure-cli/bin/pip install azure-cli
```

---

### 2. Missing subscription resource providers

First-time use of a subscription often requires registering resource providers. Run these before executing the setup script:

```bash
az provider register --namespace Microsoft.ContainerService --wait
az provider register --namespace Microsoft.Compute --wait
az provider register --namespace Microsoft.Network --wait
az provider register --namespace Microsoft.Storage --wait
```

---

### 3. ACR name already taken

ACR names are globally unique. If `acrimpulsaedu` is taken, check whether it belongs to your account before choosing a new name:

```bash
az acr show \
  --name acrimpulsaedu \
  --query "{name:name, resourceGroup:resourceGroup, loginServer:loginServer}" \
  2>&1
```

If it is yours (different subscription or resource group), set `ACR_NAME` in your `.env` to match or point the script at the existing registry.

---

### 4. Overriding script defaults on a free tier

The script defaults may exceed free-tier quotas. Always source a `.env` file to pin values:

```bash
set -a && source .env && set +a && ./infra/cluster-setup.sh
```

---

### 5. Kubernetes version not available in the region

Azure regions only expose a subset of Kubernetes versions, and free-tier subscriptions are sometimes restricted to LTS-only patch releases. List what is available:

```bash
az aks get-versions --location mexicocentral --output table
```

Pick a version marked with official support and set it in your `.env` as `KUBERNETES_VERSION=<major.minor.patch>`.

---

### 6. VM SKU not available in the selected region

Not all VM sizes are available in every region. If `az aks create` or `az aks nodepool add` fails with a quota or availability error:

```bash
# List available VM sizes in the target region
az vm list-skus --location mexicocentral --size Standard_B --output table

# Or check current quota
az vm list-usage --location mexicocentral --output table | grep -i "Standard BS"
```

Switch `SYSTEM_NODE_SKU` / `WORKLOADS_NODE_SKU` in your `.env` to an available size, or request a quota increase in the Azure portal under **Subscriptions → Usage + quotas**.
