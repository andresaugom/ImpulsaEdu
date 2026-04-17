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
LOCATION="${LOCATION:-eastus}"
KUBERNETES_VERSION="${KUBERNETES_VERSION:-1.29}"

# Node SKU — Standard_B2s: 2 vCPU, 4 GB RAM (cheapest AKS-supported B-series)
SYSTEM_NODE_SKU="Standard_B2s"
WORKLOADS_NODE_SKU="Standard_B2s"

# ---------------------------------------------------------------------------
# 1. Resource group
# ---------------------------------------------------------------------------
echo "==> Creating resource group: $RESOURCE_GROUP"
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none

# ---------------------------------------------------------------------------
# 2. AKS cluster with system node pool
#    --node-count 1 keeps cost minimal; system pool needs at least 1 node
# ---------------------------------------------------------------------------
echo "==> Creating AKS cluster: $CLUSTER_NAME (system node pool)"
az aks create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CLUSTER_NAME" \
  --location "$LOCATION" \
  --kubernetes-version "$KUBERNETES_VERSION" \
  --node-pool-name system \
  --node-count 1 \
  --node-vm-size "$SYSTEM_NODE_SKU" \
  --nodepool-mode System \
  --os-disk-size-gb 30 \
  --network-plugin azure \
  --generate-ssh-keys \
  --enable-cluster-autoscaler \
  --min-count 1 \
  --max-count 2 \
  --output none

echo "==> Cluster created."

# ---------------------------------------------------------------------------
# 3. Add workloads node pool
#    Tainted with CriticalAddonsOnly=true:NoSchedule is already on system pool
#    by default; workloads pool has no taint so application pods land here.
# ---------------------------------------------------------------------------
echo "==> Adding workloads node pool"
az aks nodepool add \
  --resource-group "$RESOURCE_GROUP" \
  --cluster-name "$CLUSTER_NAME" \
  --name workloads \
  --node-count 1 \
  --node-vm-size "$WORKLOADS_NODE_SKU" \
  --mode User \
  --os-disk-size-gb 30 \
  --enable-cluster-autoscaler \
  --min-count 1 \
  --max-count 3 \
  --output none

echo "==> Workloads node pool added."

# ---------------------------------------------------------------------------
# 4. Fetch credentials and verify connectivity
# ---------------------------------------------------------------------------
echo "==> Fetching kubeconfig"
az aks get-credentials \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CLUSTER_NAME" \
  --overwrite-existing

echo "==> Verifying cluster connectivity"
kubectl get nodes -o wide

# ---------------------------------------------------------------------------
# 5. Apply base Kubernetes manifests
# ---------------------------------------------------------------------------
echo "==> Applying base manifests (namespaces, quotas, limit ranges)"
kubectl apply -f k8s/base/namespaces.yaml
kubectl apply -f k8s/base/resourcequota-dev.yaml
kubectl apply -f k8s/base/resourcequota-prod.yaml
kubectl apply -f k8s/base/limitrange-dev.yaml
kubectl apply -f k8s/base/limitrange-prod.yaml

echo "==> Verifying namespaces"
kubectl get namespaces impulsa-dev impulsa-prod

echo "==> Verifying resource quotas"
kubectl describe resourcequota -n impulsa-dev
kubectl describe resourcequota -n impulsa-prod

echo ""
echo "Cluster setup complete."
echo "Node pools:"
az aks nodepool list \
  --resource-group "$RESOURCE_GROUP" \
  --cluster-name "$CLUSTER_NAME" \
  --output table
