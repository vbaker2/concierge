import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import agent
import tools

# Initialise the FastAPI app
app = FastAPI()

# Python models for the incoming request body
class ChatRequest(BaseModel):
    query: str

# Mount the 'static' directory to serve the index.html file
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def read_root():
    """Serves the main HTML page."""
    return FileResponse('static/index.html')

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Handles the chat request from the frontend.
    1. Gets all context data (local + APIs) from the tools module.
    2. Calls the agent with the user's query and context.
    3. Returns the AI's response.
    """
    # 1. The tools file now orchestrates all data gathering based on the query
    context_data = await tools.get_context_data(request.query)

    # 2. Call the agent to get the AI response
    ai_response = await agent.get_ai_response(request.query, context_data)

    # 3. Return the response
    return {"response": ai_response}

if __name__ == "__main__":
    # This allows running the server directly for development
    uvicorn.run(app, host="0.0.0.0", port=8000)


