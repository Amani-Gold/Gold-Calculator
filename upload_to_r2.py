import boto3
import os
from pathlib import Path

ACCESS_KEY_ID     = 'e35c5e269248efe8a986043a72d484b3'
SECRET_ACCESS_KEY = 'aed30203fd360caa51121143833a2cc6e530a1b195eaa20f31e7adfb8277176c'
ENDPOINT_URL      = 'https://00f42fd9348773e56be2e1d4ec3d157f.r2.cloudflarestorage.com'
BUCKET_NAME       = 'mementos-templates'

LOCAL_FOLDER = r'C:\Users\DELL\Downloads\InDesignEditableTemplates'

s3 = boto3.client(
    's3',
    endpoint_url=ENDPOINT_URL,
    aws_access_key_id=ACCESS_KEY_ID,
    aws_secret_access_key=SECRET_ACCESS_KEY,
    region_name='auto',
)

def upload_folder(local_path):
    folder = Path(local_path)
    files = list(folder.rglob('*'))
    files = [f for f in files if f.is_file()]

    print(f"Found {len(files)} file(s) to upload...\n")

    for file_path in files:
        key = str(file_path.relative_to(folder)).replace('\\', '/')
        print(f"Uploading: {key} ... ", end='', flush=True)
        try:
            s3.upload_file(str(file_path), BUCKET_NAME, key)
            print("OK")
        except Exception as e:
            print(f"FAILED — {e}")

    print("\nDone.")

if __name__ == '__main__':
    upload_folder(LOCAL_FOLDER)
