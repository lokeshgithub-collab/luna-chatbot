🚀 Luna Chatbot — Setup Guide

This project requires a .env file to run.
You must create your own .env file because API keys are NOT included in the repository for security reasons.

📁 1. Create .env in the root of backend folder

Create a file:

backend/.env


Add the following variables:

GEMINI_API_KEY=your_gemini_key_here
SERPAPI_KEY=your_serpapi_key_here


❗ Put your own API keys — do not share them publicly.

▶️ 2. Install Dependencies
Backend:
cd backend
npm install

Frontend:
cd ../frontend
npm install

▶️ 3. Run the Project
Start backend:
cd backend
npm start

Start frontend:
cd frontend
npm run dev
