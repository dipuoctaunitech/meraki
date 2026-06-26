# Boutique

A boutique ecommerce storefront with a FastAPI backend scaffold and Next.js frontend.

## Features

- Product catalog with detail pages
- Shopping cart (client-side, localStorage)
- FastAPI health check and static file serving
- SQLModel database scaffold for future orders/products

## Project Structure

```text
app/                  # FastAPI backend
frontend/             # Next.js storefront
  src/app/            # Pages: /, /dresses, /dresses/[id], /cart
  src/components/     # UI components
  src/lib/            # Catalog data
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
