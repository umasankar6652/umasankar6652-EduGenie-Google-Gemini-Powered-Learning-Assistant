import os
import re
import json
import logging
from typing import Dict, List, Any, Optional
from google import genai
from google.genai import errors
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch

import config

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global cache for client
_client = None
_cached_key = None

# Global cache for local models to enable lazy-loading
_local_model = None
_local_tokenizer = None

def is_gemini_active() -> bool:
    """Checks if GEMINI_API_KEY is currently configured in the environment."""
    return bool(os.getenv("GEMINI_API_KEY", ""))

def get_client() -> genai.Client:
    """Returns the initialized google-genai Client, dynamically re-initializing if key changes."""
    global _client, _cached_key
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("Gemini API key is not configured. Please add GEMINI_API_KEY to your .env file.")
    
    if _client is None or _cached_key != api_key:
        logger.info("Initializing new google-genai Client...")
        _client = genai.Client(api_key=api_key)
        _cached_key = api_key
        
    return _client

def generate_gemini_content(prompt: str, model_name: Optional[str] = None) -> str:
    """Helper to generate content using the Gemini client with error handling."""
    try:
        client = get_client()
        if not model_name:
            model_name = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")
        if not model_name:
            model_name = "gemini-2.5-flash"
            
        logger.info(f"Generating content using Gemini model '{model_name}'...")
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
        )
        if not response or not response.text:
            raise ValueError("Empty response received from Gemini API.")
        return response.text
    except Exception as e:
        logger.error(f"Gemini generation error: {e}")
        raise e

def load_local_model():
    """Lazy-loads the local tokenizer and model on CPU."""
    global _local_model, _local_tokenizer
    if _local_model is None or _local_tokenizer is None:
        model_name = "MBZUAI/LaMini-Flan-T5-77M"
        logger.info(f"Loading local model '{model_name}' and tokenizer...")
        try:
            _local_tokenizer = AutoTokenizer.from_pretrained(model_name)
            _local_model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
            logger.info("Local model and tokenizer loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load local model/tokenizer: {e}")
            raise e

def generate_local_content(prompt: str, max_length: int = 256) -> str:
    """Generates content using the local LaMini-Flan-T5 model."""
    try:
        load_local_model()
        logger.info("Generating content using local model...")
        
        inputs = _local_tokenizer(prompt, return_tensors="pt")
        
        with torch.no_grad():
            outputs = _local_model.generate(
                **inputs,
                max_length=max_length,
                do_sample=True,
                temperature=0.7,
                num_return_sequences=1
            )
            
        generated_text = _local_tokenizer.decode(outputs[0], skip_special_tokens=True)
        return generated_text
    except Exception as e:
        logger.error(f"Local model inference error: {e}")
        raise e

def clean_json_string(text: str) -> str:
    """Cleans markdown wrappers or extra characters from JSON strings before parsing."""
    text = text.strip()
    
    # Remove markdown code block fences if present
    code_block_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if code_block_match:
        text = code_block_match.group(1).strip()
        
    # If the text has characters before [ or after ], find the actual array boundaries
    array_match = re.search(r"(\[[\s\S]*\])", text)
    if array_match:
        text = array_match.group(1).strip()
        
    return text

def parse_quiz_json(raw_text: str) -> List[Dict[str, Any]]:
    """Cleans and parses the generated quiz raw text into a valid JSON array."""
    cleaned = clean_json_string(raw_text)
    try:
        quiz_data = json.loads(cleaned)
        if not isinstance(quiz_data, list):
            raise ValueError("Quiz data must be a JSON array.")
        
        # Validate format of each item
        validated_quiz = []
        for index, item in enumerate(quiz_data):
            question = item.get("question", f"Question {index + 1}")
            options = item.get("options", ["Option A", "Option B", "Option C", "Option D"])
            
            while len(options) < 4:
                options.append(f"Option {len(options) + 1}")
            options = options[:4]
            
            correct_option = item.get("correct_option", 0)
            try:
                correct_option = int(correct_option)
                if correct_option < 0 or correct_option > 3:
                    correct_option = 0
            except (ValueError, TypeError):
                correct_option = 0
                
            explanation = item.get("explanation", "No explanation provided.")
            
            validated_quiz.append({
                "id": index + 1,
                "question": question,
                "options": options,
                "correct_option": correct_option,
                "explanation": explanation
            })
            
        return validated_quiz
    except Exception as e:
        logger.error(f"JSON parsing error for raw output: {raw_text}. Error: {e}")
        return [{
            "id": 1,
            "question": "Failed to generate quiz properly. Would you like to try again?",
            "options": ["Try Again", "Go to Dashboard", "Read Help", "Contact Support"],
            "correct_option": 0,
            "explanation": f"The raw text could not be parsed: {str(e)}"
        }]
