import logging
import uuid
from typing import Optional
import boto3
from botocore.config import Config
from app.config import get_settings

logger = logging.getLogger("app.s3_service")


def get_s3_presigned_url(s3_key: Optional[str], expires_in: int = 3600) -> Optional[str]:
    if not s3_key:
        return None
    settings = get_settings()
    try:
        s3 = boto3.client("s3", region_name=settings.aws_region, config=Config(signature_version="s3v4"))
        return s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.s3_bucket_name, "Key": s3_key},
            ExpiresIn=expires_in,
        )
    except Exception as e:
        logger.warning(f"Failed to generate presigned URL for {s3_key}: {e}")
        return None


def upload_document_to_s3(image_bytes: bytes, mime_type: str, schema: str, doc_type: str) -> str:
    settings = get_settings()
    s3 = boto3.client("s3", region_name=settings.aws_region)
    ext = mime_type.split("/")[-1] if "/" in mime_type else "jpg"
    key = f"{doc_type}/{schema}/{uuid.uuid4()}.{ext}"
    s3.put_object(Bucket=settings.s3_bucket_name, Key=key, Body=image_bytes, ContentType=mime_type)
    return key

