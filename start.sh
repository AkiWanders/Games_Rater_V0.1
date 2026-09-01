#!/usr/bin/env bash
# Aki Game Rater (Python/Flask) - launcher
# Starts the local server and opens the app in your browser.

cd "$(dirname "$0")"

PORT=3000
URL="http://localhost:${PORT}"

# Use a local virtual environment. Create it and install Flask if missing.
PY=python3
if [ -x ".venv/bin/python" ]; then
  PY=".venv/bin/python"
else
  echo "Creating virtual environment..."
  if command -v uv >/dev/null 2>&1; then
    uv venv .venv || exit 1
    uv pip install -r requirements.txt 2>/dev/null || uv pip install flask || exit 1
  else
    python3 -m venv .venv || exit 1
    .venv/bin/pip install -r requirements.txt 2>/dev/null || .venv/bin/pip install flask || exit 1
  fi
  PY=".venv/bin/python"
fi

start_browser() {
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" >/dev/null 2>&1 &
  elif command -v gio >/dev/null 2>&1; then
    gio open "$URL" >/dev/null 2>&1 &
  else
    echo "Please open $URL in your browser."
  fi
}

# If server already running on the port, just open the browser.
if command -v curl >/dev/null 2>&1 && curl -s -o /dev/null --max-time 2 "$URL"; then
  echo "Server already running at $URL"
  start_browser
  exit 0
fi

echo "Starting Aki Game Rater at $URL ..."
echo "Press Ctrl+C to stop the server."
start_browser

"$PY" app.py
