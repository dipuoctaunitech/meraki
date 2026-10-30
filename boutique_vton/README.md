# Boutique

A boutique ecommerce storefront with a FastAPI backend scaffold and Next.js frontend.

## Features

- Product catalog with detail pages
- Shopping cart (client-side, localStorage)
- Credit & debit accounting (purchases, expenses, paid status, Excel reports)
- FastAPI health check and static file serving
- SQLModel database for accounting customers and ledger entries

## Project Structure

```text
app/                  # FastAPI backend
  models/             # Customer + AccountingEntry
  api/v1/endpoints/   # Accounting API
frontend/             # Next.js storefront
  src/app/            # Pages: /, /collection, /upload, /cart, /accounts
  src/components/     # UI components
  src/lib/            # Catalog + accounting API client
```

## Requirements

- Python 3.11+
- Node.js 18+

### Backend

```bash
cd boutique_vton
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

API: `http://127.0.0.1:8000`

### Frontend

```bash
cd boutique_vton/frontend
npm install
npm run dev
```

Storefront: `http://localhost:3000`

Accounting UI: `http://localhost:3000/accounts`

API routes:

- `POST /api/v1/accounting/entries` — create credit/debit entry
- `GET /api/v1/accounting/entries` — list with filters
- `GET /api/v1/accounting/summary` — totals
- `GET /api/v1/accounting/customers/by-phone/{phone}` — customer autofill
- `GET /api/v1/accounting/reports/export` — Excel download

## Tests

```bash
cd boutique_vton
pytest
```

## Docker

```bash
docker build -t boutique-api .
docker run --rm -p 8000:8000 boutique-api
```
