from flask import Flask, request, jsonify, send_from_directory
import json
import os

app = Flask(__name__)
ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(ROOT, "games.json")


def read_games():
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            games = json.load(f)
        return games if isinstance(games, list) else []
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def write_games(games):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(games, f, indent=2, ensure_ascii=False)


@app.route("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.route("/<path:filepath>")
def static_files(filepath):
    return send_from_directory(ROOT, filepath)


@app.route("/api/games", methods=["GET"])
def get_games():
    return jsonify(read_games())


@app.route("/api/games", methods=["POST"])
def post_games():
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Invalid JSON"}), 400
    games = data if isinstance(data, list) else []
    write_games(games)
    return jsonify({"ok": True, "count": len(games)})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    print(f"Aki Game Rater running at http://localhost:{port}")
    print(f"Ratings saved to: {DATA_FILE}")
    app.run(host="0.0.0.0", port=port, debug=False)
