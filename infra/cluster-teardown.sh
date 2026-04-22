#!/usr/bin/env bash
# cluster-teardown.sh — Delete the ImpulsaEdu AKS cluster and resource group
#
# Run this when the cluster is not actively needed to stop credit consumption.
# Re-run cluster-setup.sh to recreate the cluster.

set -euo pipefail

RESOURCE_GROUP="${RESOURCE_GROUP:-rg-impulsaedu}"
CLUSTER_NAME="${CLUSTER_NAME:-aks-impulsaedu}"

echo "WARNING: This will permanently delete the AKS cluster '$CLUSTER_NAME'"
echo "and all resources in resource group '$RESOURCE_GROUP'."
read -rp "Type the cluster name to confirm: " CONFIRM

if [[ "$CONFIRM" != "$CLUSTER_NAME" ]]; then
  echo "Aborted."
  exit 1
fi

echo "==> Deleting resource group $RESOURCE_GROUP (includes cluster and all associated resources)"
az group delete \
  --name "$RESOURCE_GROUP" \
  --yes \
  --no-wait

echo "Deletion initiated. Monitor progress in the Azure portal."
