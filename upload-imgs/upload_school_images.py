import argparse
import os
import re
import tempfile
import shutil
from pathlib import Path

import gdown
from azure.storage.blob import BlobServiceClient
from dotenv import load_dotenv

load_dotenv()

CONTAINER_NAME = "schools"
IMGS_FILE = Path(__file__).parent / "imgs.txt"


def parse_imgs_file(path: Path) -> list[tuple[str, str]]:
    lines = [l.strip() for l in path.read_text().splitlines() if l.strip()]
    pairs = []
    for i in range(0, len(lines) - 1, 2):
        cct = lines[i]
        url = lines[i + 1]
        pairs.append((cct, url))
    return pairs


def extract_folder_id(url: str) -> str:
    match = re.search(r"/folders/([a-zA-Z0-9_-]+)", url)
    if not match:
        raise ValueError(f"Could not extract folder ID from URL: {url}")
    return match.group(1)


def download_folder(folder_id: str, dest: str) -> list[Path]:
    gdown.download_folder(
        id=folder_id,
        output=dest,
        quiet=False,
        use_cookies=False,
    )
    files = sorted(
        p for p in Path(dest).rglob("*") if p.is_file()
    )
    return files


def upload_files(blob_service: BlobServiceClient, cct: str, files: list[Path]):
    container_client = blob_service.get_container_client(CONTAINER_NAME)

    # Ensure container exists
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
    parser = argparse.ArgumentParser(description="Upload school images to Azure Blob Storage.")
    parser.add_argument("--cct", help="School CCT identifier")
    parser.add_argument("--url", help="Google Drive folder URL for the school images")
    args = parser.parse_args()

    if bool(args.cct) != bool(args.url):
        parser.error("--cct and --url must be provided together")

    connection_string = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
    if not connection_string:
        raise EnvironmentError("AZURE_STORAGE_CONNECTION_STRING is not set")

    blob_service = BlobServiceClient.from_connection_string(connection_string)

    if args.cct and args.url:
        pairs = [(args.cct, args.url)]
    else:
        pairs = parse_imgs_file(IMGS_FILE)

    print(f"Found {len(pairs)} schools to process.\n")

    for cct, url in pairs:
        print(f"[{cct}] Downloading from {url}")
        folder_id = extract_folder_id(url)

        with tempfile.TemporaryDirectory() as tmpdir:
            try:
                files = download_folder(folder_id, tmpdir)
            except Exception as e:
                print(f"  ERROR downloading folder for {cct}: {e}")
                continue

            if not files:
                print(f"  WARNING: No files found for {cct}, skipping.")
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
