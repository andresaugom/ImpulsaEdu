#!/usr/bin/env bash
# upload-school-images.sh — Reorganize and upload school images to Azure Blob Storage
#
# Uploads images into the `schools` container following the path:
#   <CCT>/<N>.<ext>
# which resolves to the public URL:
#   https://<STORAGE_ACCOUNT>.blob.core.windows.net/schools/<CCT>/<N>.<ext>
#
# Usage:
#   ./scripts/upload-school-images.sh \
#     --cct <CCT_CODE> \
#     --images-dir <DIR> \
#     [--account <STORAGE_ACCOUNT_NAME>] \
#     [--container <CONTAINER_NAME>] \
#     [--replace-all]
#
# Options:
#   --cct         School CCT code (Clave de Centro de Trabajo). Required.
#   --images-dir  Directory containing the client-provided images. Required.
#   --account     Azure Storage Account name (default: stimpulsaedu).
#   --container   Blob container name (default: schools).
#   --replace-all Delete all existing blobs for this CCT before uploading.
#                 Use this when replacing a school's full image set.
#
# Requirements:
#   - az CLI installed and authenticated (az login)
#   - Images may use any filename; they are renamed sequentially (1, 2, 3, ...)
#     sorted by filename to preserve a consistent ordering.
#   - Supported image extensions: jpg, jpeg, png, gif, webp, avif, bmp.
#
# Examples:
#   # Fresh upload for school 09DPR0001A
#   ./scripts/upload-school-images.sh --cct 09DPR0001A --images-dir ~/Downloads/fotos-escuela
#
#   # Replace all images for school 09DPR0001A
#   ./scripts/upload-school-images.sh --cct 09DPR0001A --images-dir ~/Downloads/fotos-nuevas --replace-all

set -euo pipefail

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
STORAGE_ACCOUNT_NAME="stimpulsaedu"
STORAGE_CONTAINER_NAME="schools"
CCT=""
IMAGES_DIR=""
REPLACE_ALL=false

SUPPORTED_EXTENSIONS="jpg jpeg png gif webp avif bmp"

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --cct)        CCT="$2";                    shift 2 ;;
        --images-dir) IMAGES_DIR="$2";             shift 2 ;;
        --account)    STORAGE_ACCOUNT_NAME="$2";   shift 2 ;;
        --container)  STORAGE_CONTAINER_NAME="$2"; shift 2 ;;
        --replace-all) REPLACE_ALL=true;           shift   ;;
        *)
            echo "ERROR: Unknown argument: $1" >&2
            echo "Usage: $0 --cct <CCT> --images-dir <DIR> [--account <NAME>] [--container <NAME>] [--replace-all]" >&2
            exit 1
            ;;
    esac
done

# ---------------------------------------------------------------------------
# Validate required arguments
# ---------------------------------------------------------------------------
if [[ -z "$CCT" ]]; then
    echo "ERROR: --cct is required." >&2
    exit 1
fi

if [[ -z "$IMAGES_DIR" ]]; then
    echo "ERROR: --images-dir is required." >&2
    exit 1
fi

if [[ ! -d "$IMAGES_DIR" ]]; then
    echo "ERROR: Directory not found: $IMAGES_DIR" >&2
    exit 1
fi

# ---------------------------------------------------------------------------
# Collect and sort image files
# ---------------------------------------------------------------------------
IMAGE_FILES=()
while IFS= read -r -d $'\0' file; do
    ext="${file##*.}"
    ext_lower=$(echo "$ext" | tr '[:upper:]' '[:lower:]')
    for supported in $SUPPORTED_EXTENSIONS; do
        if [[ "$ext_lower" == "$supported" ]]; then
            IMAGE_FILES+=("$file")
            break
        fi
    done
done < <(find "$IMAGES_DIR" -maxdepth 1 -type f -print0 | sort -z)

if [[ ${#IMAGE_FILES[@]} -eq 0 ]]; then
    echo "ERROR: No supported images found in $IMAGES_DIR" >&2
    echo "       Supported formats: $SUPPORTED_EXTENSIONS" >&2
    exit 1
fi

BLOB_PREFIX="${CCT}"

echo "============================================================"
echo " ImpulsaEdu — School Image Upload"
echo "============================================================"
echo " CCT:              $CCT"
echo " Images directory: $IMAGES_DIR"
echo " Images found:     ${#IMAGE_FILES[@]}"
echo " Storage account:  $STORAGE_ACCOUNT_NAME"
echo " Container:        $STORAGE_CONTAINER_NAME"
echo " Blob prefix:      $BLOB_PREFIX/"
echo " Replace all:      $REPLACE_ALL"
echo "============================================================"
echo ""

# ---------------------------------------------------------------------------
# Verify Azure CLI is authenticated
# ---------------------------------------------------------------------------
if ! az account show --output none 2>/dev/null; then
    echo "ERROR: Not authenticated with Azure CLI. Run: az login" >&2
    exit 1
fi

# ---------------------------------------------------------------------------
# Optionally delete existing blobs for this CCT
# ---------------------------------------------------------------------------
if [[ "$REPLACE_ALL" == true ]]; then
    echo "==> Deleting existing blobs under prefix: $BLOB_PREFIX/"
    EXISTING=$(az storage blob list \
        --account-name "$STORAGE_ACCOUNT_NAME" \
        --container-name "$STORAGE_CONTAINER_NAME" \
        --prefix "${BLOB_PREFIX}/" \
        --query "[].name" \
        --output tsv 2>/dev/null || true)

    if [[ -n "$EXISTING" ]]; then
        while IFS= read -r blob_name; do
            az storage blob delete \
                --account-name "$STORAGE_ACCOUNT_NAME" \
                --container-name "$STORAGE_CONTAINER_NAME" \
                --name "$blob_name" \
                --output none
            echo "  Deleted: $blob_name"
        done <<< "$EXISTING"
        echo "  Done deleting existing blobs."
    else
        echo "  No existing blobs found for prefix $BLOB_PREFIX/."
    fi
    echo ""
fi

# ---------------------------------------------------------------------------
# Upload images sequentially
# ---------------------------------------------------------------------------
echo "==> Uploading images..."
UPLOADED=0
FAILED=0
BASE_URL="https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${STORAGE_CONTAINER_NAME}"

for i in "${!IMAGE_FILES[@]}"; do
    file="${IMAGE_FILES[$i]}"
    n=$((i + 1))
    ext="${file##*.}"
    ext_lower=$(echo "$ext" | tr '[:upper:]' '[:lower:]')
    blob_name="${BLOB_PREFIX}/${n}.${ext_lower}"

    if az storage blob upload \
        --account-name "$STORAGE_ACCOUNT_NAME" \
        --container-name "$STORAGE_CONTAINER_NAME" \
        --name "$blob_name" \
        --file "$file" \
        --overwrite true \
        --output none 2>/dev/null; then
        echo "  [OK] $(basename "$file") → ${BASE_URL}/${blob_name}"
        UPLOADED=$((UPLOADED + 1))
    else
        echo "  [FAIL] $(basename "$file") → $blob_name" >&2
        FAILED=$((FAILED + 1))
    fi
done

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "============================================================"
echo " Upload complete"
echo " Uploaded: $UPLOADED  |  Failed: $FAILED"
echo " Public URL base: ${BASE_URL}/${BLOB_PREFIX}/"
echo "============================================================"

if [[ $FAILED -gt 0 ]]; then
    exit 1
fi
