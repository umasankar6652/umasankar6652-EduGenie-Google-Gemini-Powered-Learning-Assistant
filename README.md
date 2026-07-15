# EduGenie - AI-Powered Educational Assistant

EduGenie is a cloud-first educational assistant built with FastAPI and Google Gemini. It is organized as an internship-style project portfolio, with the root repository containing the complete documentation trail and the working application code arranged by phase.

## Live Features

- Ask educational questions through a Gemini-powered chat endpoint
- Explain concepts at different academic levels
- Generate multiple-choice quizzes from a topic and difficulty level
- Summarize educational text with structured markdown output
- Produce personalized learning roadmaps

## Problem Statement

Students often need a single assistant that can explain topics clearly, generate practice material, and help plan what to learn next. Most tools solve only one of those tasks, which forces learners to jump between apps and websites.

EduGenie addresses that gap by combining learning assistance, content generation, and study planning in one simple web application.

## Repository Structure

The repository is organized into an internship-style workflow:

1. Brainstorming & Ideation - early idea notes and feature planning
2. Requirement Analysis - analysis artifacts and solution requirements
3. Project Design Phase - system design, architecture, and planning material
4. Project Planning Phase - implementation milestones and scheduling
5. Project Development Phase - the working FastAPI application and static assets
6. Project testing - testing notes and validation material
7. Project Documentation - report and viva documentation files
8. Project Demonstration - presentation and demo support material

## Project Overview

The current application is built around these components:

- `main.py` - FastAPI routes and request handling
- `models.py` - Google Gemini client management and quiz parsing helpers
- `prompts.py` - reusable prompt templates
- `config.py` - environment-based configuration
- `templates/` - Jinja2 HTML templates
- `static/` - CSS and JavaScript assets

Documentation and submission assets are also included at the repository root:

- `EduGenie_Project_Report_and_Viva_Guide.docx`
- `EduGenie_Viva_Presentation.pptx`

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Backend | FastAPI, Uvicorn | API routing and development server |
| Templating | Jinja2 | Server-rendered dashboard UI |
| AI | google-genai | Gemini client integration |
| Configuration | python-dotenv | Environment variable support |
| Frontend | HTML, CSS, JavaScript | Lightweight UI and interactivity |

## How It Works

EduGenie uses the Gemini API key from the environment to power all content-generation features. The application can hot-reload the model name and API key from the `.env` file during development, which keeps local testing flexible.

The quiz workflow also includes output cleanup and validation so the app can safely parse model responses into consistent JSON before returning them to the UI.

## API Endpoints

- `GET /` - dashboard page
- `GET /api/status` - model and API readiness check
- `POST /api/qa` - answer a question
- `POST /api/explain` - explain a concept for a selected level
- `POST /api/quiz` - generate a quiz
- `POST /api/summarize` - summarize educational text
- `POST /api/recommend` - generate a learning roadmap

## Local Setup

1. Create and activate a Python virtual environment.
2. Install dependencies.

```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the project root.

```env
GEMINI_API_KEY=your_api_key
GEMINI_MODEL_NAME=gemini-2.5-flash
HOST=127.0.0.1
PORT=8000
DEBUG=True
```

4. Start the app.

```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Open `http://127.0.0.1:8000` in your browser.

## Recommended Usage

- Use Q&A for quick concept clarification.
- Use Explain when you need the same topic rewritten for a specific academic level.
- Use Quiz when you want practice questions for revision.
- Use Summarize when you need a concise study version of a long passage.
- Use Recommend when you want a structured roadmap for a topic or skill.

## Key Notes

- The app expects `GEMINI_API_KEY` to be present for AI-powered endpoints.
- `POST /api/quiz` returns normalized JSON quiz data even if the model output is messy.
- The repo is already structured for documentation, demo delivery, and evaluation.

## Future Improvements

- Add authentication and saved user sessions
- Store quiz attempts and progress tracking
- Add tests for the API routes and JSON parsing helpers
- Add screenshots and architecture diagrams to this README
- Improve deployment documentation for Render, Vercel, or Docker hosting
