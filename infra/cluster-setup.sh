#!/usr/bin/env bash
# cluster-setup.sh — Provision the ImpulsaEdu AKS cluster
#
# Prerequisites:
#   az login (authenticated with your Azure for Students account)
#   az extension add --name aks-preview   (if needed)
#   kubectl, helm installed locally
#
# Usage:
#   chmod +x infra/cluster-setup.sh
#   ./infra/cluster-setup.sh
#
# Estimated cost (Azure for Students free credits):
#   system pool   : 1x Standard_B2s  ~$30/month
#   workloads pool: 2x Standard_B2s  ~$60/month
#   Total         : ~$90/month — well within $100 free credit for a short-lived cluster

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

# OS disk size for system node pool (match workloads pool; saves cost vs default 128 GB)
SYSTEM_NODE_OSDISK_SIZE="${SYSTEM_NODE_OSDISK_SIZE:-30}"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log() { echo "==> $*"; }

wait_for_namespace() {
  local ns="$1"
  log "Waiting for namespace '$ns' to be Active"
  kubectl wait --for=jsonpath='{.status.phase}'=Active \
    namespace/"$ns" --timeout=60s
}

# ---------------------------------------------------------------------------
# 1. Resource group
# ---------------------------------------------------------------------------
log "Creating resource group: $RESOURCE_GROUP"
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none

# ---------------------------------------------------------------------------
# 2. Azure Container Registry
#    - Admin account enabled so GitHub Actions can push images using
#      username/password credentials (ACR_USERNAME / ACR_PASSWORD secrets)
#      without needing a separately provisioned service principal.
#    - Basic SKU is sufficient for development; upgrade to Standard for prod.
# ---------------------------------------------------------------------------
log "Creating Azure Container Registry: $ACR_NAME"
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --location "$LOCATION" \
  --admin-enabled true \
  --output none

ACR_LOGIN_SERVER=$(az acr show \
  --name "$ACR_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query loginServer -o tsv)

# Retrieve admin credentials for GitHub Actions secrets
ACR_USERNAME=$(az acr credential show \
  --name "$ACR_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query username -o tsv)

ACR_PASSWORD=$(az acr credential show \
  --name "$ACR_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "passwords[0].value" -o tsv)

log "ACR login server: $ACR_LOGIN_SERVER"

# ---------------------------------------------------------------------------
# 3. Azure Blob Storage for school images
#    Public access set to 'blob' so individual blobs are publicly readable
#    (needed for frontend image URLs), while container enumeration requires
#    the connection string (used by the API service).
#
#    NOTE: Azure for Students subscriptions may have a policy that denies
#    allowBlobPublicAccess=true. If the container public-access step fails,
#    check with: az policy state list --resource <storage-account-id>
# ---------------------------------------------------------------------------
log "Creating Azure Storage Account: $STORAGE_ACCOUNT_NAME"
az storage account create \
  --name "$STORAGE_ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --allow-blob-public-access true \
  --output none

log "Creating blob container: $STORAGE_CONTAINER_NAME"
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
echo ""
echo "  AZURE_CREDENTIALS              — output of: az ad sp create-for-rbac --name sp-impulsaedu-github --role contributor --scopes /subscriptions/<SUB_ID>/resourceGroups/$RESOURCE_GROUP --sdk-auth"
echo "  ACR_LOGIN_SERVER               — $ACR_LOGIN_SERVER"
echo "  ACR_USERNAME                   — $ACR_USERNAME"
echo "  ACR_PASSWORD                   — $ACR_PASSWORD"
echo "  AZURE_RESOURCE_GROUP           — $RESOURCE_GROUP"
echo "  AKS_CLUSTER_NAME               — $CLUSTER_NAME"
echo "  AZURE_STORAGE_CONNECTION_STRING — (see below)"
echo ""
echo "  Storage connection string (add as GitHub secret AZURE_STORAGE_CONNECTION_STRING):"
echo "  $STORAGE_CONNECTION_STRING"
echo ""

# ---------------------------------------------------------------------------
# 4. AKS cluster with system node pool
#    --node-count 1      keeps cost minimal; system pool needs at least 1 node
#    --attach-acr        grants the cluster's managed identity AcrPull on the
#                        ACR — covers in-cluster image pulls. AcrPush for CI/CD
#                        is handled via the ACR admin credentials above.
#    --node-osdisk-size  set to 30 GB (matches workloads pool) to avoid paying
#                        for the default 128 GB OS disk on the system node.
# ---------------------------------------------------------------------------
log "Creating AKS cluster: $CLUSTER_NAME (system node pool)"
if az aks show --resource-group "$RESOURCE_GROUP" --name "$CLUSTER_NAME" --output none 2>/dev/null; then
  log "Cluster '$CLUSTER_NAME' already exists — skipping creation."
else
  az aks create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CLUSTER_NAME" \
    --location "$LOCATION" \
    --kubernetes-version "$KUBERNETES_VERSION" \
    --nodepool-name system \
    --node-count 1 \
    --node-vm-size "$SYSTEM_NODE_SKU" \
    --node-osdisk-size "$SYSTEM_NODE_OSDISK_SIZE" \
    --network-plugin azure \
    --generate-ssh-keys \
    --enable-cluster-autoscaler \
    --min-count 1 \
    --max-count 2 \
    --attach-acr "$ACR_NAME" \
    --output none
fi
log "Cluster ready."

log "Configuring system node pool properties"
az aks nodepool update \
  --resource-group "$RESOURCE_GROUP" \
  --cluster-name "$CLUSTER_NAME" \
  --name system \
  --mode System \
  --output none

log "Adding workloads node pool"
if az aks nodepool show --resource-group "$RESOURCE_GROUP" --cluster-name "$CLUSTER_NAME" --name workloads --output none 2>/dev/null; then
  log "Node pool 'workloads' already exists — skipping."
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
log "Node pools ready."

# ---------------------------------------------------------------------------
# 5. Fetch credentials and verify connectivity
# ---------------------------------------------------------------------------
log "Fetching kubeconfig"
az aks get-credentials \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CLUSTER_NAME" \
  --overwrite-existing

log "Verifying cluster connectivity"
kubectl get nodes -o wide

# ---------------------------------------------------------------------------
# 6. Create the production namespace
#    Applied first so the impulsa-secrets step below can reference it
#    immediately. We wait for Active before proceeding.
# ---------------------------------------------------------------------------
log "Applying namespace manifests"
kubectl apply -f k8s/base/namespaces.yaml

wait_for_namespace impulsa

# ---------------------------------------------------------------------------
# 6a. Create impulsa-secrets in the namespace
#     Requires DB_PASSWORD and JWT_SECRET to be set in the environment.
#     In CI/CD these come from GitHub Actions secrets; locally set them before
#     running this script:
#       export DB_PASSWORD='...'
#       export JWT_SECRET='...'
# ---------------------------------------------------------------------------
: "${DB_PASSWORD:?DB_PASSWORD must be set}"
: "${JWT_SECRET:?JWT_SECRET must be set}"

log "Creating impulsa-secrets in impulsa"
kubectl create secret generic impulsa-secrets \
  --from-literal=DB_PASSWORD="$DB_PASSWORD" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=AZURE_STORAGE_CONNECTION_STRING="$STORAGE_CONNECTION_STRING" \
  --namespace impulsa \
  --dry-run=client -o yaml | kubectl apply -f -

# ---------------------------------------------------------------------------
# 7. Install ingress-nginx controller on the workloads node pool
#    The workloads node pool has no taints, so ingress-nginx pods land there
#    automatically (system pool rejects non-system workloads by default).
#
#    --wait is intentionally omitted here because the Azure LoadBalancer IP
#    assignment can take well over 5 minutes in some regions (including
#    mexicocentral). Instead, we wait explicitly on the deployment rollout
#    and then poll the LB IP separately.
# ---------------------------------------------------------------------------
log "Adding Helm repos (ingress-nginx, jetstack)"
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add jetstack https://charts.jetstack.io
helm repo update

log "Installing ingress-nginx controller"
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz

log "Waiting for ingress-nginx controller deployment to be Ready"
kubectl rollout status deployment/ingress-nginx-controller \
  -n ingress-nginx --timeout=5m

log "Waiting for ingress-nginx LoadBalancer IP to be assigned (may take several minutes)"
for i in $(seq 1 30); do
  LB_IP=$(kubectl get svc ingress-nginx-controller -n ingress-nginx \
    -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)
  if [[ -n "$LB_IP" ]]; then
    log "ingress-nginx LoadBalancer IP: $LB_IP  (use this for the DNS A record)"
    break
  fi
  echo "  ... still waiting ($i/30)"
  sleep 10
done

if [[ -z "${LB_IP:-}" ]]; then
  echo "WARNING: LoadBalancer IP not yet assigned after 5 minutes."
  echo "         Run: kubectl get svc ingress-nginx-controller -n ingress-nginx"
  echo "         and create the DNS A record once the IP appears."
fi

# ---------------------------------------------------------------------------
# 8. Install cert-manager and configure ClusterIssuers for Let's Encrypt
#    After the cert-manager-webhook deployment is rolled out, a short sleep
#    is required: the webhook's TLS certificate needs a few seconds to be
#    served before the API server can reach it. Applying ClusterIssuers too
#    early causes a transient admission webhook error.
# ---------------------------------------------------------------------------
log "Installing cert-manager"
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true \
  --wait \
  --timeout 5m

log "Waiting for cert-manager webhooks to be Ready"
kubectl rollout status deployment/cert-manager-webhook \
  -n cert-manager --timeout=3m

log "Allowing cert-manager webhook TLS to become ready (15s)"
sleep 15

log "Applying ClusterIssuers (staging + prod)"
kubectl apply -f k8s/base/cert-manager/clusterissuer.yaml

log "Verifying ClusterIssuers"
kubectl get clusterissuer

# ---------------------------------------------------------------------------
# 9. Apply the production overlay via kustomize
#    Deploys all workloads, services, ingress, resource quotas, and limit
#    ranges for the single production namespace (impulsa).
#    cert-manager and ingress-nginx must already be running (steps 7–8).
# ---------------------------------------------------------------------------
log "Applying production manifests (kustomize overlay: k8s/overlays/prod)"
kubectl apply -k k8s/overlays/prod

log "Verifying namespace"
kubectl get namespace impulsa

log "Verifying resource quotas"
kubectl describe resourcequota -n impulsa

echo ""
echo "Cluster setup complete."
echo ""
echo "Next steps for HTTPS:"
echo "  1. Get the LoadBalancer IP:  kubectl get svc ingress-nginx-controller -n ingress-nginx"
echo "  2. Create an A record:       app.impulsaedu.com -> <LoadBalancer IP>"
echo "  3. Monitor cert issuance:    kubectl describe certificate impulsa-tls -n impulsa"
echo "  See docs/dns-configuration.md for full instructions."
echo ""
echo "GitHub Actions secrets to configure:"
echo "  AZURE_CREDENTIALS, ACR_LOGIN_SERVER, ACR_USERNAME, ACR_PASSWORD,"
echo "  AZURE_RESOURCE_GROUP, AKS_CLUSTER_NAME, AZURE_STORAGE_CONNECTION_STRING"
echo "  (values printed above)"
echo ""
echo "Node pools:"
az aks nodepool list \
  --resource-group "$RESOURCE_GROUP" \
  --cluster-name "$CLUSTER_NAME" \
  --output table
