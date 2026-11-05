# Voice-Based Legal Assistance Platform (Vakil Setu)

Production-ready MVP using React (Vite), Node.js (Express), and MongoDB (Mongoose).

## Features

- Voice input recording from browser
- Speech-to-text via Whisper API (`/api/voice/process`)
- AI legal issue classification (`/api/ai/classify`)
- Advocate matching by expertise + availability
- Booking creation and storage in MongoDB
- Razorpay order creation and payment verification
- Emergency mode for highest-rated available advocate

## Project Structure

```
Vakil-setu/
  backend/
    src/
      models/
      routes/
      controllers/
      services/
      middlewares/
  frontend/
    src/
      pages/
      components/
      api/
      state/
```

## Environment Setup

### Backend (`backend/.env`)

Copy `backend/.env.example` and fill values.

Provider switches:

- `LLM_PROVIDER=gateway` for your college gateway (`/gateway/llm/chat`)
- `LLM_PROVIDER=gemini` to use Gemini directly (`GEMINI_MODEL`, `LLM_API_KEY`)

### Frontend (`frontend/.env`)

```
VITE_API_BASE_URL=http://localhost:5000
VITE_STT_PROVIDER=backend_whisper
VITE_ENABLE_TTS=true
```

Frontend switches:

- `VITE_STT_PROVIDER=backend_whisper` -> audio upload to backend Whisper
- `VITE_STT_PROVIDER=webspeech` -> browser Web Speech recognition
- `VITE_ENABLE_TTS=true` -> browser speech synthesis for AI summary

## Run Instructions

From project root:

```bash
npm install
npm run install:all
npm run dev
```

This starts:

- Backend on `http://localhost:5000`
- Frontend on Vite default port (usually `http://localhost:5173`)

## API Endpoints

- `POST /api/voice/process`
- `POST /api/ai/classify`
- `POST /api/advocates/match`
- `POST /api/bookings`
- `POST /api/emergency`
- `POST /api/payments/create-order`
- `POST /api/payments/verify`

## Scrape Advocate Dataset

You can scrape advocate listings and import them into MongoDB.

1. Add URLs in `backend/.env`:
   - `SCRAPE_URLS=https://site-1.com/lawyers,https://site-2.com/advocates`
   - `SCRAPE_MAX_PAGES=3`
   - `SCRAPE_PROFILE_DEPTH=10`
2. Run:

```bash
npm run scrape:advocates --prefix backend
```

The script normalizes data into your `Advocate` schema and upserts by name.
It now supports pagination crawl and profile-level enrichment.
