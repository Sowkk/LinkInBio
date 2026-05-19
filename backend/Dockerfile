# WHY python:3.12-slim?
# "slim" is a minimal Python image — smaller size, faster to download
# Full python image is 1GB+, slim is ~130MB
FROM python:3.12-slim

# Set working directory inside container
WORKDIR /app

# WHY copy requirements first, then code?
# Docker builds in layers — each line is a cached layer
# If we copy all code first, any code change rebuilds the pip install layer (slow!)
# By copying requirements first, pip install only reruns when requirements.txt changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Now copy the rest of the code
COPY . .

# Expose port 8000 so other containers can reach it
EXPOSE 8000

# Start the server
# WHY 0.0.0.0? "localhost" inside a container is isolated
# 0.0.0.0 means "accept connections from anywhere" — needed for Docker networking
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
