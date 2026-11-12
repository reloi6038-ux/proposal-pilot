# ProposalPilot

> AI-crafted freelance proposals, paid per generation with PayPal. Paste a job description, generate a client-ready proposal in seconds, and only pay for what you use.

ProposalPilot is a full-stack web application that combines **Google Gemini** for AI proposal writing with **PayPal** for per-generation billing. It is built for freelancers who want to spend less time writing proposals and more time winning work.

---

## Features

- **AI proposal generation** — tailored to each job description and your profile
- **Pay-per-proposal billing** — buy credit packs via PayPal Sandbox
- **Credit-based access control** — each generation costs 1 credit, refunded automatically if AI fails
- **Server-side payment verification** — PayPal captures are verified before credits are added
- **Duplicate-payment protection** — atomic database transitions prevent double credit grants
- **PayPal webhooks** — asynchronous reconciliation for payments missed by the browser
- **Proposal history** — every generation saved, with full-page reader, copy, and download
- **Profile management** — skills, bio, and experience used to personalise proposals
- **JWT authentication** — secure password hashing (bcrypt) and token-based sessions
- **Input validation and rate limiting** — hardened against abuse

---

## Tech Stack

| Layer    | Technology                                          |
| -------- | --------------------------------------------------- |
| Backend  | Node.js, Express.js                                 |
| Database | MongoDB (Atlas) via Mongoose                        |
| Auth     | JWT, bcrypt                                         |
| AI       | Google Gemini via `@google/genai`                   |
| Payments | PayPal REST Orders v2 + JS SDK v6 + Webhooks        |
| Security | Helmet, CORS, express-rate-limit, express-validator |
| Frontend | Vanilla HTML / CSS / JavaScript                     |

---

## Architecture

Browser
│ HTTPS
▼
Express API (Node.js)
├── /api/auth → register, login, me, profile
├── /api/paypal → create-order, capture-order
├── /api/ai → generate, history, proposals/:id
├── /api/config → public PayPal clientId
└── /api/webhooks → PayPal webhook handler
│
▼
MongoDB Atlas
├── users
├── transactions
├── proposals
└── webhookevents
│
▼
External APIs
├── PayPal Orders v2
└── Google Gemini

**Payment flow (frontend-initiated):**

1. User clicks "Buy Starter" → `POST /api/paypal/create-order`
2. Backend creates a PayPal order (server-side price lookup) → returns `paypalOrderId`
3. Frontend renders PayPal button with that order ID
4. User approves in PayPal popup
5. Frontend calls `POST /api/paypal/capture-order` with `paypalOrderId`
6. Backend captures, verifies `COMPLETED`, atomically updates the transaction, adds credits

**Webhook flow (asynchronous reconciliation):**

1. PayPal sends `PAYMENT.CAPTURE.COMPLETED` to `/api/webhooks/paypal`
2. Signature verified via PayPal's postback API
3. Event ID checked against `webhookevents` (unique index) to prevent replays
4. Transaction updated and credits added if not already processed

**AI flow:**

1. User submits a job description → `POST /api/ai/generate`
2. Backend atomically deducts 1 credit (fails 402 if 0)
3. Calls Gemini with exponential backoff on 429/503
4. On success: saves proposal, returns text + remaining credits
5. On failure: refunds credit and returns 502/503

---

## Project Structure

proposal-pilot/
├── server.js
├── .env ← not committed
├── .gitignore
├── config/
│ ├── db.js
│ └── creditPacks.js
├── models/
│ ├── User.js
│ ├── Transaction.js
│ ├── Proposal.js
│ └── WebhookEvent.js
├── middleware/
│ ├── auth.js
│ ├── validate.js
│ └── rateLimiters.js
├── controllers/
│ ├── authController.js
│ ├── paypalController.js
│ ├── aiController.js
│ └── webhookController.js
├── routes/
│ ├── authRoutes.js
│ ├── paypalRoutes.js
│ ├── aiRoutes.js
│ ├── configRoutes.js
│ └── webhookRoutes.js
├── services/
│ ├── paypalService.js
│ ├── aiService.js
│ └── webhookService.js
├── utils/
│ └── generateToken.js
└── public/
├── index.html
├── register.html
├── login.html
├── dashboard.html
├── generate.html
├── history.html
├── proposal.html
├── profile.html
├── buy-credits.html
├── css/
│ ├── style.css
│ └── app.css
└── js/
├── auth.js
├── app.js
└── paypal.js

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- MongoDB Atlas account (free tier works)
- PayPal Developer account with a Sandbox app
- Google Gemini API key
- Git

### 1. Clone and install

```bash
git clone <your-repo-url>
cd proposal-pilot
npm install
```
