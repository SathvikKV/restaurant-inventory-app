# Restaurant Inventory App (Kosh / SANQ)

Backend and mobile app for Sanq.ai's restaurant inventory platform. This is the main product. Mise (a separate repo) is a WhatsApp and Telegram bot that feeds data into this system, but everything a restaurant owner or staff member actually sees day to day lives here.

Internally this project is sometimes called Kosh. The app itself is branded SANQ.

## Structure

```
backend/    FastAPI backend, Postgres via Supabase
mobile/     Expo React Native app
```

## What this system does

- Restaurant onboarding: phone and OTP login, create restaurant, invite team members
- Menu scanning: photograph a menu, AI infers dishes and their ingredients, owner reviews and edits before saving
- Inventory management: receive, issue, adjust, log waste, all with a full chronological history per item
- Invoice and kitchen indent scanning, with AI-based item matching against existing inventory
- A review flow for anything the AI could not confidently match, either resolved immediately during scanning or later from a notifications screen
- Analytics: food cost trends, top items by waste, inventory health
- Sync with Mise so that WhatsApp and Telegram activity shows up here too

## Backend

FastAPI, async SQLAlchemy, Postgres (Supabase). One tenant per restaurant, each with its own Postgres schema. Public tables (`public.users`, `public.tenants`) hold cross-tenant account data; everything else lives inside each tenant's own schema.

### Local development

```
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Copy `.env.example` to `.env` and fill in real values: `DATABASE_URL`, `SECRET_KEY`, `GEMINI_API_KEY`, AWS credentials, `S3_BUCKET_NAME`, `MISE_SERVICE_SECRET`, `MISE_INBOUND_SECRET`, `MISE_WRITEBACK_URL`.

### Tenant models

Each tenant's tables (`inventory`, `purchases`, `issues`, `wastage`, `recipes`, `recipe_ingredients`, `confirmations`, `staff_contacts`, `inventory_transactions`) are created dynamically per schema. See `app/services/tenant_registry.py` and `app/models/tenant.py`.

New tenants get their tables automatically. Existing tenants do not automatically get new columns added to already-existing tables when the model changes, since `create_all()` only creates missing tables, not missing columns. When adding a column to an existing tenant table, you need to manually run an `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` across all existing tenant schemas. There is a self-heal routine on startup that helps with genuinely new tables for existing tenants, but it does not cover new columns. This has caused real bugs more than once. A proper migration system (Alembic, or extending the self-heal routine) is on the list of things to fix.

### Item matching

Inventory items now carry a Gemini embedding, stored per item, computed once and cached. When a new item name comes in from an invoice, menu scan, or indent, it gets compared against existing items using cosine similarity, not plain string matching. Thresholds:

- 0.95 and above, and units match: merge automatically
- 0.95 and above, but units differ: flag for review rather than silently combining incompatible units
- 0.80 to 0.95: flag for review
- Below 0.80: treat as a genuinely new item

Anything flagged for review becomes a row in the `confirmations` table for that tenant, and shows up in the app's notifications screen, or is resolved immediately during the scan itself if the mobile app catches it before final save.

### Units

All weight quantities are stored internally in grams, all volume quantities in millilitres, regardless of what unit the original invoice or menu said. Displayed values convert back to kilograms or litres above 1000. See `app/services/units.py`. This exists so that a 500 gram invoice line and a 5 kilogram existing stock level can be compared correctly, instead of accidentally treating differently scaled units as either a mismatch or, worse, silently adding numbers from two different scales together.

### Service-to-service authentication

Most endpoints expect a normal user JWT. A small number of endpoints (used by Mise to resolve tenants, upload photos, and save scanned invoices and indents on a user's behalf) also accept a shared service token instead, via the `X-Mise-Service-Token` header. See `app/middleware/auth_middleware.py`, `get_current_actor`. When authenticated this way, the caller must supply `tenant_schema` and `recorded_by_name` explicitly in the request body, since there is no logged-in session to derive them from.

## Mobile app

Expo React Native. Tested through Expo Go during development; production builds go through EAS.

```
cd mobile
npm install
npx expo start
```

### Building an Android release

```
eas build --platform android --profile preview
```

produces an installable APK with a shareable link, no Play Store submission needed. See `eas.json` for build profiles.

## Deployment

Backend runs on AWS Elastic Beanstalk, `ap-south-1`, application name `kosh`.

```
cd backend
eb deploy
```

Logs are best viewed through CloudWatch rather than SSH, since SSH sessions to the instance are unreliable for long-running tail commands:

```
aws logs tail /aws/elasticbeanstalk/kosh-prod/var/log/web.stdout.log --follow --region ap-south-1
```

## Known limitations

- Google Sheets auto-provisioning for new tenants does not work. The Google service account used has no Drive storage quota of its own, so it cannot create new spreadsheet files. Needs a Google Workspace Shared Drive with the service account added as a member, or domain-wide delegation.
- The web dashboard (Next.js, not in this list of structure above since it is being reworked) is not built out yet. Mobile is the primary interface.
- Sales and point-of-sale tracking does not exist yet. Inventory tracks what comes in and what gets issued or wasted, not what gets sold to a customer. This is a deliberately separate, later phase.
- Several test tenant schemas from development exist in the database alongside real tenants and have not been cleaned up.
