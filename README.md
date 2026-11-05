# Voice-Based Legal Assistance Platform (Vakil Setu)

The website supports voice or typed legal triage, advocate profiles and consultation requests. WhatsApp has been removed from the website; its independent backend demo remains available in the repository.

Local multilingual vector and hybrid retrieval are implemented for the legal corpus. See [vector setup and retrieval modes](docs/VECTOR_RETRIEVAL.md) and the [source integrity audit](docs/RAG_DATA_AUDIT.md). The website's classification flow is still separate from the RAG knowledge endpoints. BNS currency through 2025 is not certified.

The earlier standalone messaging demonstration is documented in [WHATSAPP_DEMO.md](docs/WHATSAPP_DEMO.md), with setup in [TWILIO_SANDBOX.md](docs/TWILIO_SANDBOX.md). It is not required to run the website.

## Existing browser prototype

- Voice input recording from browser
- Speech-to-text through the browser Web Speech API (Hindi/English selection)
- AI legal issue classification (`/api/ai/classify`)
- Advocate matching by expertise + availability
- Booking creation and storage in MongoDB
- Razorpay order creation and payment verification
- Available-advocate lookup (does not contact the advocate)

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
VITE_ENABLE_TTS=true
```

Frontend switches:

- Voice recognition uses the browser Web Speech API; typed input is also available.
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
