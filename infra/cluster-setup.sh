#!/usr/bin/env bash
# cluster-setup.sh — Provision the ImpulsaEdu AKS cluster
#
# Prerequisites:
#   az login (authenticated with your Azure for Students account)
#   az extension add --name aks-preview   (if needed)
#   kubectl installed locally
#
# Usage:
#   chmod +x infra/cluster-setup.sh
#   ./infra/cluster-setup.sh
#
# Estimated cost (Azure for Students free credits):
#   system pool  : 1x Standard_B2s  ~$30/month
#   workloads pool: 2x Standard_B2s ~$60/month
#   Total        : ~$90/month — well within $100 free credit for a short-lived cluster

set -euo pipefail

# ---------------------------------------------------------------------------
# Variables — override via environment or edit here
# ---------------------------------------------------------------------------
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-impulsaedu}"
CLUSTER_NAME="${CLUSTER_NAME:-aks-impulsaedu}"
LOCATION="${LOCATION:-mexicocentral}"
KUBERNETES_VERSION="${KUBERNETES_VERSION:-1.29}"

# ACR name must be globally unique and alphanumeric only (no hyphens)
ACR_NAME="${ACR_NAME:-acrimpulsaedu}"

# Storage account name must be globally unique, 3-24 chars, lowercase alphanumeric
STORAGE_ACCOUNT_NAME="${STORAGE_ACCOUNT_NAME:-stimpulsaedu}"
STORAGE_CONTAINER_NAME="${STORAGE_CONTAINER_NAME:-schools}"

# Node SKU — Standard_B2s: 2 vCPU, 4 GB RAM (cheapest AKS-supported B-series)
SYSTEM_NODE_SKU="${SYSTEM_NODE_SKU:-Standard_B2s}"
WORKLOADS_NODE_SKU="${WORKLOADS_NODE_SKU:-Standard_B2s}"

# ---------------------------------------------------------------------------
# 1. Resource group
# ---------------------------------------------------------------------------
echo "==> Creating resource group: $RESOURCE_GROUP"
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none

# ---------------------------------------------------------------------------
# 2. Azure Container Registry
#    Created before the cluster so we can attach it at cluster creation time.
#    Basic SKU is sufficient for development; upgrade to Standard for prod.
# ---------------------------------------------------------------------------
echo "==> Creating Azure Container Registry: $ACR_NAME"
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --location "$LOCATION" \
  --output none

ACR_LOGIN_SERVER=$(az acr show \
  --name "$ACR_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query loginServer -o tsv)

echo "==> ACR login server: $ACR_LOGIN_SERVER"

# ---------------------------------------------------------------------------
# 3. Azure Blob Storage for school images
#    Public access set to 'blob' — individual blobs are publicly readable
#    (needed to serve images to the frontend via direct URL), while container
#    enumeration requires the connection string (used by the API service).
# ---------------------------------------------------------------------------
echo "==> Creating Azure Storage Account: $STORAGE_ACCOUNT_NAME"
az storage account create \
  --name "$STORAGE_ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --allow-blob-public-access true \
  --output none

echo "==> Creating blob container: $STORAGE_CONTAINER_NAME"
az storage container create \
  --name "$STORAGE_CONTAINER_NAME" \
  --account-name "$STORAGE_ACCOUNT_NAME" \
  --public-access blob \
  --output none

STORAGE_CONNECTION_STRING=$(az storage account show-connection-string \
  --name "$STORAGE_ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query connectionString -o tsv)

echo ""
echo "  *** Add the following GitHub Actions secrets to your repository ***"
echo "  AZURE_CREDENTIALS              — output of: az ad sp create-for-rbac --name sp-impulsaedu-github --role contributor --scopes /subscriptions/<SUB_ID>/resourceGroups/$RESOURCE_GROUP --sdk-auth"
echo "  ACR_LOGIN_SERVER               — $ACR_LOGIN_SERVER"
echo "  AZURE_RESOURCE_GROUP           — $RESOURCE_GROUP"
echo "  AKS_CLUSTER_NAME               — $CLUSTER_NAME"
echo "  AZURE_STORAGE_CONNECTION_STRING — (see below)"
echo ""
echo "  Storage connection string (add as GitHub secret AZURE_STORAGE_CONNECTION_STRING):"
echo "  $STORAGE_CONNECTION_STRING"
echo ""

# ---------------------------------------------------------------------------
# 3. AKS cluster with system node pool
#    --node-count 1 keeps cost minimal; system pool needs at least 1 node
#    --attach-acr grants the cluster's managed identity AcrPull on the ACR.
# ---------------------------------------------------------------------------
echo "==> Creating AKS cluster: $CLUSTER_NAME (system node pool)"
if az aks show --resource-group "$RESOURCE_GROUP" --name "$CLUSTER_NAME" --output none 2>/dev/null; then
  echo "==> Cluster '$CLUSTER_NAME' already exists — skipping creation."
else
az aks create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CLUSTER_NAME" \
  --location "$LOCATION" \
  --kubernetes-version "$KUBERNETES_VERSION" \
  --nodepool-name system \
  --node-count 1 \
  --node-vm-size "$SYSTEM_NODE_SKU" \
  --network-plugin azure \
  --generate-ssh-keys \
  --enable-cluster-autoscaler \
  --min-count 1 \
  --max-count 2 \
  --attach-acr "$ACR_NAME" \
  --output none
fi
echo "==> Cluster ready."

echo "==> Configuring system node pool properties"
az aks nodepool update \
  --resource-group "$RESOURCE_GROUP" \
  --cluster-name "$CLUSTER_NAME" \
  --name system \
  --mode System \
  --output none

echo "==> Adding workloads node pool"
if az aks nodepool show --resource-group "$RESOURCE_GROUP" --cluster-name "$CLUSTER_NAME" --name workloads --output none 2>/dev/null; then
  echo "==> Node pool 'workloads' already exists — skipping."
else
  az aks nodepool add \
    --resource-group "$RESOURCE_GROUP" \
    --cluster-name "$CLUSTER_NAME" \
    --name workloads \
    --mode User \
    --node-count 1 \
    --node-vm-size "$WORKLOADS_NODE_SKU" \
    --node-osdisk-size 30 \
    --enable-cluster-autoscaler \
    --min-count 1 \
    --max-count 3 \
    --output none
fi
echo "==> Node pools ready."

# ---------------------------------------------------------------------------
# 5. Fetch credentials and verify connectivity
# ---------------------------------------------------------------------------
echo "==> Fetching kubeconfig"
az aks get-credentials \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CLUSTER_NAME" \
  --overwrite-existing

echo "==> Verifying cluster connectivity"
kubectl get nodes -o wide

# ---------------------------------------------------------------------------
# 6. Apply base Kubernetes manifests
# ---------------------------------------------------------------------------
echo "==> Applying base manifests (namespaces, quotas, limit ranges)"
kubectl apply -f k8s/base/namespaces.yaml
kubectl apply -f k8s/base/resourcequota-dev.yaml
kubectl apply -f k8s/base/resourcequota-prod.yaml
kubectl apply -f k8s/base/limitrange-dev.yaml
kubectl apply -f k8s/base/limitrange-prod.yaml

# ---------------------------------------------------------------------------
# 6a. Create impulsa-secrets in both namespaces
#     Requires DB_PASSWORD and JWT_SECRET to be set in the environment.
#     In CI/CD these come from GitHub Actions secrets; locally set them before
#     running this script:
#       export DB_PASSWORD='...'
#       export JWT_SECRET='...'
# ---------------------------------------------------------------------------
: "${DB_PASSWORD:?DB_PASSWORD must be set}"
: "${JWT_SECRET:?JWT_SECRET must be set}"

echo "==> Creating impulsa-secrets in impulsa-dev"
kubectl create secret generic impulsa-secrets \
  --from-literal=DB_PASSWORD="$DB_PASSWORD" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=AZURE_STORAGE_CONNECTION_STRING="$STORAGE_CONNECTION_STRING" \
  --namespace impulsa-dev \
  --dry-run=client -o yaml | kubectl apply -f -

echo "==> Creating impulsa-secrets in impulsa-prod"
kubectl create secret generic impulsa-secrets \
  --from-literal=DB_PASSWORD="$DB_PASSWORD" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=AZURE_STORAGE_CONNECTION_STRING="$STORAGE_CONNECTION_STRING" \
  --namespace impulsa-prod \
  --dry-run=client -o yaml | kubectl apply -f -

echo "==> Verifying namespaces"
kubectl get namespaces impulsa-dev impulsa-prod

echo "==> Verifying resource quotas"
kubectl describe resourcequota -n impulsa-dev
kubectl describe resourcequota -n impulsa-prod

# ---------------------------------------------------------------------------
# 6. Install ingress-nginx controller on the workloads node pool
#    The workloads node pool has no taints, so ingress-nginx pods land there
#    automatically (system pool rejects non-system workloads by default).
# ---------------------------------------------------------------------------
echo "==> Adding Helm repos (ingress-nginx, jetstack)"
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add jetstack https://charts.jetstack.io
helm repo update

echo "==> Installing ingress-nginx controller"
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz \
  --wait \
  --timeout 5m

echo "==> Waiting for ingress-nginx controller to be Ready"
kubectl rollout status deployment/ingress-nginx-controller -n ingress-nginx --timeout=3m

echo "==> ingress-nginx LoadBalancer IP (use this for the DNS A record):"
kubectl get svc ingress-nginx-controller -n ingress-nginx \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}{"\n"}'

# ---------------------------------------------------------------------------
# 7. Install cert-manager and configure ClusterIssuers for Let's Encrypt
# ---------------------------------------------------------------------------
echo "==> Installing cert-manager"
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true \
  --wait \
  --timeout 5m

echo "==> Waiting for cert-manager webhooks to be Ready"
kubectl rollout status deployment/cert-manager-webhook -n cert-manager --timeout=3m

echo "==> Applying ClusterIssuers (staging + prod)"
kubectl apply -f k8s/base/cert-manager/clusterissuer.yaml

echo "==> Verifying ClusterIssuers"
kubectl get clusterissuer

# ---------------------------------------------------------------------------
# 8. Apply Ingress manifest
#    Prerequisite: DNS A record must resolve app.impulsaedu.com (or your
#    custom APP_DOMAIN) to the ingress-nginx LoadBalancer IP shown above.
#    See docs/dns-configuration.md for full instructions.
#    NOTE: The Ingress is configured with letsencrypt-staging by default.
#          Switch cert-manager.io/cluster-issuer to letsencrypt-prod once
#          staging certificate issuance is confirmed.
# ---------------------------------------------------------------------------
echo "==> Applying Ingress"
kubectl apply -f k8s/base/ingress.yaml

echo ""
echo "Cluster setup complete."
echo ""
echo "Next steps for HTTPS:"
echo "  1. Get the LoadBalancer IP:  kubectl get svc ingress-nginx-controller -n ingress-nginx"
echo "  2. Create an A record:       app.impulsaedu.com -> <LoadBalancer IP>"
echo "  3. Monitor cert issuance:    kubectl describe certificate impulsa-tls -n impulsa-dev"
echo "  4. After staging succeeds, edit k8s/base/ingress.yaml and switch"
echo "     cert-manager.io/cluster-issuer to letsencrypt-prod, then re-apply."
echo "  See docs/dns-configuration.md for full instructions."
echo ""
echo "Node pools:"
az aks nodepool list \
  --resource-group "$RESOURCE_GROUP" \
  --cluster-name "$CLUSTER_NAME" \
  --output table
