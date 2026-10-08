# AI Revenue Recovery Command Center (`ai-revenue-recovery`)

Institutional-grade, high-density dark fintech command center for autonomous payment failure diagnosis, remediation, and revenue recovery (Stripe Sigma / Palantir Foundry style).

---

## 🏛️ Visual Identity & Design System

- **Background:** Deep Carbon (`#0B0F17` / `#07090E`) with layered slate mesh (`#111827`) and subtle radial illumination.
- **Borders & Dividers:** Translucent border lines (`rgba(255, 255, 255, 0.08)` / `border-translucent`).
- **Brand Accents:**
  - **Electric Emerald / Recovered Green (`#10B981`)**: Recovered funds, approved card transactions, nominal telemetry.
  - **Cyber Cyan / Diagnosis (`#06B6D4`)**: Forensic AI root cause inferences, Groq & Gemini reasoning paths.
  - **Warning Amber / Bounded Safety (`#F59E0B`)**: 3DS challenges, operational holds, policy limits.
  - **Threat Crimson / Risk (`#EF4444`)**: Elevated velocity declines, card blocks, escalated defaults.
- **Visual Polish:**
  - Radial glowing gradients behind KPI telemetry cards (`shadow-glow-emerald`, `shadow-glow-cyan`, etc.).
  - Glassmorphic panels (`backdrop-blur-md`, 1px inner glows).
  - Shimmer / sweep skeleton loading animations.
  - Smooth Framer Motion spring physics & layout animations.
  - Scanline CRT effect on the streaming Live Terminal.

---

## 📂 Architecture & Directory Structure

```text
ai-revenue-recovery/
├── .env.example
├── package.json
├── README.md
├── backend/
│   ├── config/
│   │   └── db.js                    # Resilient MongoDB connector with in-memory fallback
│   ├── controllers/
│   │   ├── caseController.js        # Recovery cases, metrics, smart retries
│   │   ├── simulationController.js  # Synthetic failure injection, WhatsApp & Voice turns
│   │   └── copilotController.js     # AI Copilot natural language queries
│   ├── models/
│   │   ├── RecoveryCase.js          # High-density recovery case schema
│   │   ├── AuditLog.js              # Cryptographically sealed SHA-256 audit ledger
│   │   ├── Customer.js              # Enterprise customer tiers, MRR, contact preferences
│   │   └── Transaction.js           # Gateway transactions, decline codes, attempts
│   ├── services/
│   │   ├── aiDiagnosisService.js    # Gemini 2.5 Flash, Groq Llama 3.3 70B & Algorithmic fallback
│   │   ├── auditService.js          # Cryptographic audit hash computation & Socket.IO broadcast
│   │   ├── mockGateway.js           # Multi-gateway switch simulation (Stripe, Adyen, Checkout.com)
│   │   └── scheduler.js             # 15s autonomous background recovery daemon
│   ├── server.js                    # Express + Socket.IO server & API router
│   ├── package.json
│   └── .env
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Dashboard.jsx        # Institutional command center master layout
    │   │   ├── Metrics.jsx          # KPI telemetry cards with sparklines & radial glow
    │   │   ├── CaseTable.jsx        # High-density transaction recovery grid & detail drawer
    │   │   ├── LiveTerminal.jsx     # Streaming event terminal with SHA-256 seals
    │   │   ├── WhatsAppSimulator.jsx# Omnichannel interactive mobile recovery flow
    │   │   ├── VoiceAgent.jsx       # AI Voice Concierge with Web Speech API & audio waveform
    │   │   └── Copilot.jsx          # Natural language AI recovery assistant
    │   ├── hooks/
    │   │   ├── useSocket.js         # Real-time WebSocket hook
    │   │   └── useWebSpeech.js      # Web Speech API recognition & synthesis hook
    │   ├── context/
    │   │   └── SocketContext.jsx    # Live telemetry & latency ping provider
    │   ├── styles/
    │   │   └── animations.css       # FinTech keyframes, scanlines, and border gradients
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css                # Slate mesh, JetBrains Mono & Inter typography
    ├── tailwind.config.js           # Carbon palette, glow shadows, translucent borders
    ├── vite.config.js               # Vite proxy config for backend & socket.io
    └── package.json
```

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
# In the root workspace:
npm run install:all
```

Or individually:
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure Environment
Copy `.env.example` into `backend/.env`:
```bash
cp .env.example backend/.env
```
*(Optional: Insert `GEMINI_API_KEY` or `GROQ_API_KEY` if you have them. The system includes an intelligent algorithmic FinTech heuristic engine so it operates immediately even without external API keys).*

### 3. Run Development Servers
From the root:
```bash
npm run dev
```

Or run in separate terminals:
```bash
# Terminal 1: Backend (Port 5000)
cd backend
npm run dev

# Terminal 2: Frontend (Port 5173)
cd frontend
npm run dev
```

Open **`http://localhost:5173`** in your browser.
