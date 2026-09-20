# Kautilya — AI Voice Banking Assistant

An AI-powered voice banking assistant that enables customers to interact with banking services through natural voice conversations. Built with a real-time voice agent pipeline using LiveKit, Gemini, Deepgram, and Sarvam AI.

> **Disclaimer:** This project uses a simulated banking environment for demonstration purposes and is not connected to real banking infrastructure.

---

## Architecture

```
┌─────────────┐     HTTPS      ┌─────────────────┐     PostgreSQL    ┌──────────────┐
│   Frontend   │ ◄────────────► │     Backend     │ ◄───────────────► │   Database   │
│   (Vercel)   │                │    (Render)     │                   │  (Managed)   │
│              │                │                 │                   └──────────────┘
│  React/Vite  │                │  FastAPI/Uvicorn│
│  TypeScript  │                │  SQLAlchemy     │
└──────┬───────┘                └────────┬────────┘
       │                                 │
       │  WebRTC (LiveKit)               │  JWT Service Auth
       │                                 │
       ▼                                 ▼
┌──────────────────────────────────────────────────┐
│              LiveKit Cloud                        │
│                                                   │
│  ┌───────────────────────────────────────┐       │
│  │          Voice Agent                   │       │
│  │                                        │       │
│  │  STT: Deepgram Nova-3 (multilingual)  │       │
│  │  LLM: Google Gemini                   │       │
│  │  TTS: Sarvam AI (Indian languages)    │       │
│  └───────────────────────────────────────┘       │
└──────────────────────────────────────────────────┘
```

### Data Flow

1. Customer authenticates via the frontend (email + phone).
2. Backend creates a call record and issues a scoped LiveKit room token.
3. Frontend connects to LiveKit via WebRTC for real-time audio.
4. The voice agent (running on LiveKit Cloud) processes speech:
   - **STT** → Deepgram transcribes customer speech
   - **LLM** → Gemini processes intent and generates responses
   - **TTS** → Sarvam AI synthesizes speech in Indian languages
5. Agent calls backend APIs for banking operations (account lookup, payment promises, escalation).
6. On call end, Gemini generates a structured call summary.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy (async), Alembic |
| **Database** | PostgreSQL (asyncpg driver) |
| **Voice Agent** | LiveKit Agents SDK, Python |
| **STT** | Deepgram Nova-3 (multilingual) |
| **LLM** | Google Gemini |
| **TTS** | Sarvam AI (bulbul:v3) |
| **Auth** | Session-based (customer), JWT (service-to-service) |

---

## Features

- **Voice Banking** — Natural voice conversations for account balance, EMI details, loan status
- **Multilingual** — English and 10 Indian languages with automatic language detection
- **Payment Promises** — Record payment commitments via voice
- **Human Escalation** — Automatic escalation to human representatives
- **Call History** — Full call history with AI-generated summaries
- **Voice Personas** — Kubera (male) and Kanchana (female) voice personas
- **Real-time Transcripts** — Live transcription displayed during calls
- **Text Chat** — In-call text messaging alongside voice

---

## Local Development Setup

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.12
- **PostgreSQL** ≥ 15
- **LiveKit Cloud** account
- **API Keys**: Deepgram, Google Gemini, Sarvam AI

### 1. Clone the Repository

```bash
git clone <repository-url>
cd voice-agent
```

### 2. Database Setup

```bash
# Create the PostgreSQL database
createdb voice_banking

# Run migrations
cd backend
pip install -r requirements.txt
alembic upgrade head
```

### 3. Environment Variables

Copy `.env.example` files in each component directory:

```bash
cp backend/.env.example backend/.env
cp agent/.env.example agent/.env
cp frontend/.env.example frontend/.env
```

Edit each `.env` file with your actual credentials. See the [Environment Variables](#environment-variables) section for details.

### 4. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start the development server
uvicorn app.main:app --reload
```

The backend runs at `http://localhost:8000`.

### 5. Agent Setup

```bash
cd agent
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start in development mode
python agent.py dev
```

### 6. Frontend Setup

```bash
cd frontend
npm install

# Start the development server
npm run dev
```

The frontend runs at `http://localhost:5173`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (`postgresql+asyncpg://...`) |
| `LIVEKIT_URL` | ✅ | LiveKit Cloud WebSocket URL |
| `LIVEKIT_API_KEY` | ✅ | LiveKit API key |
| `LIVEKIT_API_SECRET` | ✅ | LiveKit API secret |
| `BACKEND_API_KEY` | ✅ | API key for frontend → backend authentication |
| `AGENT_SERVICE_SECRET` | ✅ | JWT signing key for agent ↔ backend service auth |
| `GOOGLE_API_KEY` | ✅ | Google Gemini API key (call summarization) |
| `CORS_ORIGINS` | ✅ | Comma-separated allowed origins |

### Agent (`agent/.env`)

| Variable | Required | Description |
|---|---|---|
| `LIVEKIT_URL` | ✅ | LiveKit Cloud WebSocket URL |
| `LIVEKIT_API_KEY` | ✅ | LiveKit API key |
| `LIVEKIT_API_SECRET` | ✅ | LiveKit API secret |
| `GOOGLE_API_KEY` | ✅ | Google Gemini API key (LLM) |
| `DEEPGRAM_API_KEY` | ✅ | Deepgram API key (STT) |
| `SARVAM_API_KEY` | ✅ | Sarvam AI API key (TTS) |
| `AGENT_SERVICE_SECRET` | ✅ | JWT signing key (must match backend) |
| `BACKEND_URL` | ✅ | Backend API URL |
| `STT_PROVIDER` | | STT provider (`deepgram`) |
| `GEMINI_MODEL` | | Gemini model name |
| `SARVAM_TTS_MODEL` | | Sarvam TTS model |
| `DEFAULT_ASSISTANT` | | Default voice persona (`kubera` or `kanchana`) |
| `DEFAULT_LANGUAGE` | | Default language code (`en-IN`) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | ✅ | Backend API URL |
| `VITE_LIVEKIT_URL` | | LiveKit URL (informational; provided by backend at runtime) |

---

## Database Migrations

Migrations are managed with Alembic. The `DATABASE_URL` environment variable is read automatically.

```bash
cd backend

# Apply all migrations
alembic upgrade head

# Create a new migration after model changes
alembic revision --autogenerate -m "description"

# Check current migration state
alembic current
```

---

## Testing

### Backend

```bash
cd backend
python -m pytest
```

### Frontend

```bash
cd frontend
npm run lint
npm run build
```

---

## Deployment Architecture

### Frontend → Vercel

- **Framework**: Vite
- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Environment variables**: `VITE_API_BASE_URL`

### Backend → Render

- **Runtime**: Docker or Python
- **Start command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Health check**: `GET /health`
- **Pre-deploy command**: `cd backend && alembic upgrade head`
- **Environment variables**: See [Backend Environment Variables](#backend-backendenv)

### Agent → LiveKit Cloud

- **Runtime**: Docker
- **Entry point**: `python agent.py start`
- **Environment variables**: See [Agent Environment Variables](#agent-agentenv)
- Secrets are injected as runtime environment variables via LiveKit Cloud dashboard.

### Database → Managed PostgreSQL

- Use a managed PostgreSQL provider (Render PostgreSQL, Supabase, Neon, etc.)
- Set `DATABASE_URL` in the backend environment
- Run `alembic upgrade head` before first deployment

---

## Security Model

### Authentication Layers

1. **Customer Authentication** — Session-based auth with UUID session tokens stored in `localStorage`. Sessions expire automatically.
2. **Service-to-Service Authentication** — Short-lived JWT tokens (5-minute lifetime) signed with `AGENT_SERVICE_SECRET`, used for agent → backend API calls.
3. **LiveKit Room Security** — Scoped access tokens with room-specific grants. The backend controls room names, participant identities, and metadata.

### Security Principles

- The frontend never handles secrets — all sensitive operations go through the backend.
- LiveKit participant metadata contains only opaque IDs (customer_id, call_id), never PII.
- CORS is restricted to configured origins in production.
- Backend API keys and service secrets are validated using constant-time comparison.
- Account verification is enforced before exposing any customer data.

---

## Project Structure

```
voice-agent/
├── frontend/              # React/Vite frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── contexts/      # React contexts (CallContext)
│   │   ├── lib/           # API client, voice service, utilities
│   │   ├── pages/         # Route pages
│   │   └── types/         # TypeScript type definitions
│   └── ...
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── api/           # Route handlers (auth, calls, customers, livekit)
│   │   ├── core/          # Auth middleware
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   └── services/      # Business logic (auth, Gemini)
│   ├── alembic/           # Database migrations
│   └── ...
├── agent/                 # LiveKit voice agent
│   ├── ai/                # AI provider integrations (LLM, STT, TTS)
│   ├── banking/           # Banking tool implementations
│   ├── conversation/      # Conversation state management
│   ├── prompts/           # System prompts
│   └── agent.py           # Agent entry point
├── .env.example           # Root environment variable reference
└── README.md
```

---

## Limitations

- **Simulated Banking** — All banking data is stored in the application's PostgreSQL database. No real banking infrastructure is connected.
- **No Password Authentication** — Customer authentication uses email + phone number matching (no passwords or MFA).
- **No Real Payment Processing** — Payment promises are recorded as database entries only.
- **Voice Only** — Text chat messages are forwarded to the voice agent but there is no dedicated text-only mode.
- **Single Concurrent Call** — Each customer can have one active voice call at a time.
- **No Persistent Chat** — In-call text messages are not persisted between sessions.
