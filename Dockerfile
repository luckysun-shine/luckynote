# syntax=docker/dockerfile:1

FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package.json ./
RUN npm install
COPY frontend ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PYTHONPATH=/app LUCKYNOTE_DATA_DIR=/data
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt
COPY backend /app/backend
COPY --from=web /web/dist /app/frontend/dist
EXPOSE 8907
VOLUME ["/data"]
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8907"]
