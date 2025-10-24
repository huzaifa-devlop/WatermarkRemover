from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import requests
from io import BytesIO
import base64

app = FastAPI()

# Define the list of allowed origins (domains)
# This list is updated with the current live domains:
origins = [
    # 1. Local Development Origins
    "http://localhost:5173",  # Your local Vite dev server
    "http://localhost:3000",
    "http://localhost:8000",

    # 2. Production Origins (Render and Vercel)
    "https://watermark-remover-api-eenv.onrender.com",  # Your confirmed Render API domain
    "https://watermark-remover-ten.vercel.app"          # <-- LATEST VERCEL FRONTEND DOMAIN
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
DEWATERMARK_API_URL = "https://platform.dewatermark.ai/api/object_removal/v1/erase_watermark"
API_KEY = "5d123808784a2a7ab0b930398c12ec46ff0385452a1618918af0a7c4465be21f"

@app.post("/api/remove-watermark")
async def remove_watermark(
    file: UploadFile = File(...),
    mask: UploadFile = File(None)
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload a valid image file.")

    try:
        image_bytes = await file.read()
        files = {
            "original_preview_image": (file.filename, BytesIO(image_bytes), file.content_type),
            "remove_text": (None, "true")
        }

        if mask:
            mask_bytes = await mask.read()
            files["mask_image"] = ("mask.png", BytesIO(mask_bytes), "image/png")

        headers = {"X-API-KEY": API_KEY}
        response = requests.post(DEWATERMARK_API_URL, headers=headers, files=files)
        data = response.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Upstream error: {e}")

    if "edited_image" not in data or "image" not in data["edited_image"]:
        return JSONResponse(
            status_code=502,
            content={
                "error": "Dewatermark API failed or returned invalid content.",
                "hint": "Try a different image or check your API usage.",
                "details": data
            }
        )

    image_data = base64.b64decode(data["edited_image"]["image"])
    buf = BytesIO(image_data)
    buf.seek(0)

    return StreamingResponse(buf, media_type="image/png", headers={
        "Content-Disposition": f'inline; filename="cleaned_{file.filename}"'
    })
