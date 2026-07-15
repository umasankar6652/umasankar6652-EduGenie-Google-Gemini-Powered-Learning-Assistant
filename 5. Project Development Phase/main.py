import os
import logging
from fastapi import FastAPI, Request, HTTPException, Form
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field
from dotenv import load_dotenv

import config
import models
import prompts

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="EduGenie",
    description="AI-powered educational assistant with local offline fallback",
    version="2.1.0"
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Mount static and templates
os.makedirs(os.path.join(BASE_DIR, "static", "css"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "static", "js"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "templates"), exist_ok=True)

app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))


# Request Schemas
class QARequest(BaseModel):
    question: str = Field(..., min_length=3, description="The educational question to ask.")
    use_local: bool = Field(False, description="Whether to force the local model for inference.")

class ExplainRequest(BaseModel):
    concept: str = Field(..., min_length=2, description="The educational concept to explain.")
    level: str = Field("Teenager", description="Target academic level: Child, Teenager, College Student, Expert.")

class QuizRequest(BaseModel):
    topic: str = Field(..., min_length=2, description="The topic to generate a quiz on.")
    num_questions: int = Field(5, ge=1, le=10, description="Number of questions (1-10).")
    difficulty: str = Field("Medium", description="Difficulty level: Easy, Medium, Hard.")

class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=10, description="The educational text to summarize.")
    max_length: int = Field(150, ge=30, le=512, description="Maximum summary length.")

class RecommendRequest(BaseModel):
    topic: str = Field(..., min_length=2, description="The subject or skill to learn.")
    level: str = Field("Beginner", description="Starting level: Beginner, Intermediate, Advanced.")


def check_and_reload_api_key():
    """Checks if the API key or model name has changed in .env and updates config on-the-fly."""
    load_dotenv(override=True)
    
    new_key = os.getenv("GEMINI_API_KEY", "")
    new_model = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")
    
    # Update model name if changed
    if config.GEMINI_MODEL_NAME != new_model:
        logger.info(f"Updating GEMINI_MODEL_NAME in config: {config.GEMINI_MODEL_NAME} -> {new_model}")
        config.GEMINI_MODEL_NAME = new_model
        
    # Configure API key if updated or not initialized yet
    if config.GEMINI_API_KEY != new_key:
        config.GEMINI_API_KEY = new_key
        logger.info("Successfully updated Gemini API key on-the-fly.")


@app.get("/", response_class=HTMLResponse)
async def read_dashboard(request: Request):
    """Serves the EduGenie dashboard."""
    check_and_reload_api_key()
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "gemini_active": models.is_gemini_active(),
            "local_model_name": "MBZUAI/LaMini-Flan-T5-77M"
        }
    )


@app.get("/api/status")
async def get_status():
    """Returns the status of both AI backends."""
    check_and_reload_api_key()
    return {
        "gemini_active": models.is_gemini_active(),
        "local_model_loaded": models._local_model is not None,
        "local_model_name": "MBZUAI/LaMini-Flan-T5-77M"
    }


@app.post("/api/qa")
async def ask_question(data: QARequest):
    """Answers educational questions using either Local T5 or Gemini API."""
    check_and_reload_api_key()
    
    # Decide model based on checkbox ("use_local" represents High Precision checkbox checked) or missing key
    if data.use_local or not models.is_gemini_active():
        prompt = f"Answer this question: {data.question}"
        try:
            answer = models.generate_local_content(prompt, max_length=200)
            return {
                "answer": answer,
                "model_used": "Local Model (MBZUAI/LaMini-Flan-T5-77M)",
                "success": True
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Local model error: {str(e)}")
    else:
        prompt = prompts.QA_PROMPT.format(question=data.question)
        try:
            answer = models.generate_gemini_content(prompt, model_name="gemini-2.5-flash")
            return {
                "answer": answer,
                "model_used": "Google Gemini (gemini-2.5-flash)",
                "success": True
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")


@app.post("/api/explain")
async def explain_concept(data: ExplainRequest):
    """Explains a concept simplified to specific academic levels."""
    check_and_reload_api_key()
    
    if not models.is_gemini_active():
        raise HTTPException(
            status_code=400, 
            detail="Gemini API Key is not set. This premium feature requires a Gemini key in your .env file."
        )
        
    prompt = prompts.EXPLAIN_PROMPT.format(concept=data.concept, level=data.level)
    try:
        explanation = models.generate_gemini_content(prompt)
        return {
            "concept": data.concept,
            "level": data.level,
            "explanation": explanation,
            "model_used": f"Google Gemini ({config.GEMINI_MODEL_NAME})",
            "success": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/quiz")
async def generate_quiz(data: QuizRequest):
    """Generates an interactive multiple-choice quiz."""
    check_and_reload_api_key()
    
    if not models.is_gemini_active():
        raise HTTPException(
            status_code=400, 
            detail="Gemini API Key is not set. Quiz generation requires a Gemini key in your .env file."
        )
        
    prompt = prompts.QUIZ_PROMPT.format(
        topic=data.topic, 
        num_questions=data.num_questions, 
        difficulty=data.difficulty
    )
    try:
        raw_response = models.generate_gemini_content(prompt)
        quiz_json = models.parse_quiz_json(raw_response)
        return {
            "topic": data.topic,
            "difficulty": data.difficulty,
            "questions": quiz_json,
            "model_used": f"Google Gemini ({config.GEMINI_MODEL_NAME})",
            "success": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/summarize")
async def summarize_text(data: SummarizeRequest):
    """Summarizes text using local T5 or Gemini API."""
    check_and_reload_api_key()
    
    if not models.is_gemini_active():
        prompt = f"Summarize the following educational text: {data.text}"
        try:
            summary = models.generate_local_content(prompt, max_length=data.max_length)
            return {
                "summary": summary,
                "model_used": "Local Model (MBZUAI/LaMini-Flan-T5-77M)",
                "success": True
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Local summarizer failed: {str(e)}")
    else:
        prompt = prompts.SUMMARIZE_PROMPT.format(text=data.text, max_length=data.max_length)
        try:
            summary = models.generate_gemini_content(prompt)
            return {
                "summary": summary,
                "model_used": f"Google Gemini ({config.GEMINI_MODEL_NAME})",
                "success": True
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Cloud summarizer failed: {str(e)}")


@app.post("/api/recommend")
async def recommend_path(data: RecommendRequest):
    """Generates a personalized educational roadmap."""
    check_and_reload_api_key()
    
    if not models.is_gemini_active():
        raise HTTPException(
            status_code=400, 
            detail="Gemini API Key is not set. Learning recommendations require a Gemini key in your .env file."
        )
        
    prompt = prompts.RECOMMEND_PROMPT.format(topic=data.topic, level=data.level)
    try:
        roadmap = models.generate_gemini_content(prompt)
        return {
            "topic": data.topic,
            "level": data.level,
            "roadmap": roadmap,
            "model_used": f"Google Gemini ({config.GEMINI_MODEL_NAME})",
            "success": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
