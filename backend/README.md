# Kosh Backend

FastAPI backend for **Kosh** — Smart Inventory Management for Restaurants.

## Stack

| Layer | Choice |
|-------|--------|
| Framework | FastAPI 0.115 |
| Language | Python 3.12+ |
| DB | PostgreSQL (async via SQLAlchemy + asyncpg) |
| Migrations | Alembic |
| Auth | JWT (python-jose) + OTP via SMS |
| OTP Storage | Redis |
| AI | Gemini API (recommendations, chat, OCR) |
| Storage | AWS S3 (invoice photos) |
| Notifications | WhatsApp Cloud API / Twilio SMS |

---

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app + CORS + router mounts
│   ├── config.py            # pydantic-settings config (reads .env)
│   ├── database.py          # Async DB session factory (stub)
│   │
│   ├── models/              # DB-layer data shapes (replace with ORM models)
│   │   ├── restaurant.py
│   │   ├── user.py
│   │   ├── inventory.py
│   │   ├── purchase_order.py
│   │   ├── wastage.py
│   │   └── transaction.py   # Immutable stock ledger
│   │
│   ├── schemas/             # Pydantic request/response schemas
│   │   ├── auth.py
│   │   ├── inventory.py
│   │   ├── purchase_order.py
│   │   └── common.py        # Wastage, User, Restaurant schemas
│   │
│   ├── routers/             # FastAPI route handlers
│   │   ├── auth.py          # POST /send-otp, /verify-otp, /me, /logout
│   │   ├── restaurants.py   # CRUD /restaurants
│   │   ├── inventory.py     # CRUD + stock movements /inventory
│   │   ├── purchase_orders.py  # CRUD + approve/reject/receive /purchase-orders
│   │   ├── wastage.py       # Record + summarise /wastage
│   │   ├── users.py         # Manage team /users
│   │   ├── ai.py            # Recommendations, chat, OCR /ai
│   │   └── reports.py       # Analytics /reports
│   │
│   ├── services/            # Business logic (called by routers)
│   │   ├── auth_service.py
│   │   ├── inventory_service.py
│   │   ├── ai_service.py
│   │   └── notification_service.py
│   │
│   └── middleware/
│       └── auth.py          # get_current_user, require_owner dependencies
│
├── requirements.txt
├── .env.example
├── Procfile
└── README.md
```

---

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/send-otp` | Send OTP to phone |
| POST | `/api/v1/auth/verify-otp` | Verify OTP → JWT |
| POST | `/api/v1/auth/select-restaurant` | Switch restaurant context |
| GET  | `/api/v1/auth/me` | Current user profile |
| POST | `/api/v1/auth/logout` | Invalidate session |
| GET  | `/api/v1/restaurants` | List restaurants |
| POST | `/api/v1/restaurants` | Create restaurant |
| GET  | `/api/v1/inventory` | List items (filter by category/status) |
| POST | `/api/v1/inventory` | Create item |
| GET  | `/api/v1/inventory/{id}` | Item detail + supplier prices |
| POST | `/api/v1/inventory/{id}/receive` | Receive stock |
| POST | `/api/v1/inventory/{id}/issue` | Issue to kitchen |
| POST | `/api/v1/inventory/{id}/adjust` | Stock-take correction |
| GET  | `/api/v1/inventory/{id}/transactions` | Transaction history |
| GET  | `/api/v1/purchase-orders` | List POs |
| POST | `/api/v1/purchase-orders` | Create PO |
| POST | `/api/v1/purchase-orders/{id}/action` | Approve / reject |
| POST | `/api/v1/purchase-orders/{id}/receive` | Mark delivered |
| POST | `/api/v1/wastage` | Record wastage |
| GET  | `/api/v1/wastage/summary` | Wastage summary |
| GET  | `/api/v1/users` | List team members |
| POST | `/api/v1/users/invite` | Invite user |
| GET  | `/api/v1/ai/recommendations` | AI order suggestions |
| POST | `/api/v1/ai/chat` | AI assistant chat |
| POST | `/api/v1/ai/ocr/invoice` | Parse invoice image |
| GET  | `/api/v1/ai/insights` | Cost / wastage insights |
| GET  | `/api/v1/reports/food-cost-trend` | Daily food cost |
| GET  | `/api/v1/reports/top-items` | Top items by usage |
| GET  | `/api/v1/reports/wastage-summary` | Wastage analytics |
| GET  | `/api/v1/reports/inventory-health` | Health score |
| GET  | `/health` | Health check |

---

## Getting Started

```bash
# 1. Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# 4. Run the dev server
uvicorn app.main:app --reload --port 8000
```

The interactive API docs will be available at **http://localhost:8000/docs**.

---

## Implementation Checklist

- [ ] Wire up PostgreSQL (replace `database.py` stub)
- [ ] Run `alembic init alembic` and create migration scripts from models
- [ ] Implement JWT signing in `auth_service.py` (python-jose)
- [ ] Set up Redis for OTP storage and token denylist
- [ ] Implement OTP SMS dispatch (Twilio / MSG91)
- [ ] Wire up Gemini API in `ai_service.py` (reference `mise/app/services/vision.py`)
- [ ] Configure S3 bucket for invoice photo uploads
- [ ] Add `Depends(get_current_user)` to all protected routes
- [ ] Add `Depends(require_owner)` to PO approval and user management routes
- [ ] Write Alembic migrations
- [ ] Add pytest tests for each router
