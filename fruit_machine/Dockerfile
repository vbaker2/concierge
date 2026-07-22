FROM python:3.12-slim

WORKDIR /app

# Install dependencies first for better layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code
COPY . .

# Cloud Run injects PORT (defaults to 8080); the server reads it.
ENV PORT=8080
EXPOSE 8080

CMD ["python", "server.py"]
