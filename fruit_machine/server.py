"""
Aleks' Lucky 8's — tiny web server for the 4-reel fruit machine.

The whole game is a self-contained static page (static/index.html); this server
just serves it and a health check. It binds to the port Google Cloud provides in
the PORT environment variable (Cloud Run / App Engine set this to 8080).
"""
import os
import uvicorn
from fastapi import FastAPI
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

app = FastAPI(title="Aleks' Lucky 8's", docs_url=None, redoc_url=None)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def index():
    """Serve the fruit machine."""
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/healthz")
def healthz():
    """Liveness/readiness probe for Cloud Run."""
    return PlainTextResponse("ok")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    uvicorn.run(app, host="0.0.0.0", port=port)
