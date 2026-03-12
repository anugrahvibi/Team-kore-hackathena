# Cascadenet Backend

FastAPI backend mapping routes to the AI/ML models.

## Setup

```bash
cd Backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```
