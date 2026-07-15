# Phase 8: Project Demonstration - Launch Guide

To run a live project demo for the viva voce, follow these steps:

1. Open your terminal in the `5. Project Development Phase` folder.
2. Initialize and activate the python virtual environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Set your Gemini API key in a `.env` file inside that folder:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL_NAME=gemini-3.5-flash
   ```
4. Start the server using Uvicorn:
   ```bash
   uvicorn main:app --reload
   ```
5. Open your web browser and navigate to `http://127.0.0.1:8000` to interact with the project!
