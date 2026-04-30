import argparse
import os
import tempfile
import zipfile
from pathlib import Path

from azure.storage.blob import BlobServiceClient
from dotenv import load_dotenv

load_dotenv()

CONTAINER_NAME = "schools"
IMGS_DIR = Path(__file__).parent / "imgs"


def get_zip_pairs(cct: str | None = None) -> list[tuple[str, Path]]:
    """Return (cct, zip_path) pairs from the imgs directory."""
    if cct:
        zip_path = IMGS_DIR / f"{cct}.zip"
        if not zip_path.exists():
            raise FileNotFoundError(f"No zip file found for CCT '{cct}' at {zip_path}")
        return [(cct, zip_path)]

    pairs = []
    for zip_path in sorted(IMGS_DIR.glob("*.zip")):
        pairs.append((zip_path.stem, zip_path))
    return pairs


def extract_files(zip_path: Path, dest: str) -> list[Path]:
    """Extract all files from zip into dest, return sorted file paths."""
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(dest)
    files = sorted(p for p in Path(dest).rglob("*") if p.is_file())
    return files


def upload_files(blob_service: BlobServiceClient, cct: str, files: list[Path]):
    container_client = blob_service.get_container_client(CONTAINER_NAME)

    try:
        container_client.create_container()
    except Exception:
        pass  # Already exists

    for n, file_path in enumerate(files, start=1):
        ext = file_path.suffix  # includes the dot, e.g. ".jpg"
        blob_name = f"{cct}/{n}{ext}"
        print(f"  Uploading {file_path.name} → {blob_name}")
        with open(file_path, "rb") as data:
            container_client.upload_blob(name=blob_name, data=data, overwrite=True)


def main():
    parser = argparse.ArgumentParser(
        description="Upload school images from local zip files to Azure Blob Storage."
    )
    parser.add_argument("--cct", help="Process only this CCT (zip file must be imgs/{CCT}.zip)")
    args = parser.parse_args()

    connection_string = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
    if not connection_string:
        raise EnvironmentError("AZURE_STORAGE_CONNECTION_STRING is not set")

    blob_service = BlobServiceClient.from_connection_string(connection_string)

    try:
        pairs = get_zip_pairs(args.cct)
    except FileNotFoundError as e:
        parser.error(str(e))

    print(f"Found {len(pairs)} school(s) to process.\n")

    for cct, zip_path in pairs:
        print(f"[{cct}] Extracting from {zip_path.name}")
        with tempfile.TemporaryDirectory() as tmpdir:
            try:
                files = extract_files(zip_path, tmpdir)
            except Exception as e:
                print(f"  ERROR extracting zip for {cct}: {e}")
                continue

            if not files:
                print(f"  WARNING: No files found in {zip_path.name}, skipping.")
                continue

            print(f"  Found {len(files)} file(s). Uploading...")
            try:
                upload_files(blob_service, cct, files)
            except Exception as e:
                print(f"  ERROR uploading files for {cct}: {e}")
                continue

        print(f"  Done.\n")

    print("All schools processed.")


if __name__ == "__main__":
    main()
