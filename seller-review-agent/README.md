# Seller Review Agent

A FastAPI service in the NextShop workspace for reviewing seller onboarding documents. It exposes a health endpoint and an authenticated review endpoint that checks submitted documents with Gemini.

## Requirements

- Python 3.10 or newer
- A Gemini API key to use the review endpoint

## Setup

From this directory, create and activate a virtual environment, then install the dependencies:

```sh
python -m venv .venv
```

On Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

On macOS or Linux:

```sh
source .venv/bin/activate
```

Install packages and configure local environment variables:

```sh
pip install -r requirements.txt
cp .env.example .env
```

Set `AGENT_API_TOKEN` and `GEMINI_API_KEY` in `.env`. Keep those secret values out of source control.

## Run

From the workspace root, start the service through Nx:

```sh
npx nx run seller-review-agent:serve
```

Or, from this directory:

```sh
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The service listens on port `8000` by default. Interactive API documentation is available at `/docs`.

## Endpoints

- `GET /health` reports whether the service is running.
- `POST /review` reviews seller details and uploaded document URLs. Send a bearer token matching `AGENT_API_TOKEN`; the endpoint also requires `GEMINI_API_KEY` to be configured.

The review request and response schemas are defined in `app/main.py` and published in the OpenAPI documentation at `/docs`.
