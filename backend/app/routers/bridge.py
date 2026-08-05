import asyncio
from fastapi import APIRouter, UploadFile, File, Form, Depends
from app.services.mise_auth import verify_mise_service_token
from app.services.s3_service import upload_document_to_s3

router = APIRouter()

@router.post("/upload-photo", summary="Bridge endpoint for Mise to upload document photos to Kosh S3")
async def bridge_upload_photo(file: UploadFile = File(...), schema: str = Form(...), doc_type: str = Form(...), _: None = Depends(verify_mise_service_token)):
    image_bytes = await file.read()
    s3_key = await asyncio.to_thread(upload_document_to_s3, image_bytes, file.content_type or "image/jpeg", schema, doc_type)
    return {"s3_key": s3_key}
