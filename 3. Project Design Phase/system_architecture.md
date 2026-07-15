# Phase 3: Project Design Phase - EduGenie

## Client-Server System Flow
1. Client Web Browser -> loads index.html served by FastAPI templates.
2. User selects active Tab (Q&A, Explainer, Quiz, Summarizer, Roadmap).
3. Form triggers Async Fetch request to FastAPI backend (/api/qa, /api/quiz, etc.).
4. FastAPI validates request payload using Pydantic schemas.
5. Models Handler decides AI Backend:
   - Local AI: LaMini-Flan-T5-77M is loaded dynamically on CPU via torch.
   - Cloud AI: GenerativeModel client connects to Google Gemini 3.5 API.
6. JSON Response returned to browser.
7. JavaScript parses JSON, converts Markdown to HTML using Marked.js, and displays outcome.
8. Activity History caches the response payload in localStorage for offline retrieval.
