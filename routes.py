"""
EduMentor AI – routes.py (Blueprint)
Defines all REST API endpoints and view routes for the application.
"""

import logging
from flask import Blueprint, render_template, request, jsonify
from edumentor.watsonx_client import get_watsonx_response, parse_sections

logger = logging.getLogger(__name__)

# Create the main blueprint
main_bp = Blueprint("main", __name__)


# ──────────────────────────────────────────────────────────────────────────────
# View Routes
# ──────────────────────────────────────────────────────────────────────────────

@main_bp.route("/")
def index():
    """Render the main EduMentor AI dashboard."""
    return render_template("index.html")


# ──────────────────────────────────────────────────────────────────────────────
# API Routes
# ──────────────────────────────────────────────────────────────────────────────

@main_bp.route("/api/learn", methods=["POST"])
def learn():
    """
    POST /api/learn
    Accepts subject, topic, and difficulty; returns structured AI-generated
    educational content from IBM watsonx.ai.

    Request JSON:
        {
            "subject":    "Mathematics",
            "topic":      "Quadratic Equations",
            "difficulty": "Beginner"
        }

    Response JSON:
        {
            "success":  true,
            "raw":      "<full model output>",
            "sections": { "explanation": "...", "notes": "...", ... },
            "subject":  "Mathematics",
            "topic":    "Quadratic Equations",
            "difficulty": "Beginner"
        }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"success": False, "error": "Invalid or missing JSON body."}), 400

    subject    = data.get("subject", "").strip()
    topic      = data.get("topic", "").strip()
    difficulty = data.get("difficulty", "Beginner").strip()

    # ── Input validation ─────────────────────────────────────────────────────
    if not subject:
        return jsonify({"success": False, "error": "Subject is required."}), 400
    if not topic:
        return jsonify({"success": False, "error": "Topic is required."}), 400
    if difficulty not in ("Beginner", "Intermediate", "Advanced"):
        difficulty = "Beginner"

    logger.info(f"[/api/learn] subject={subject!r} topic={topic!r} difficulty={difficulty!r}")

    # ── Call IBM watsonx.ai ──────────────────────────────────────────────────
    result = get_watsonx_response(subject, topic, difficulty)

    if not result["success"]:
        return jsonify({
            "success": False,
            "error": result.get("error", "Unknown error from IBM watsonx.ai.")
        }), 502

    # ── Parse sections from raw response ─────────────────────────────────────
    sections = parse_sections(result["content"])

    return jsonify({
        "success":    True,
        "raw":        result["content"],
        "sections":   sections,
        "subject":    subject,
        "topic":      topic,
        "difficulty": difficulty
    })


@main_bp.route("/api/health", methods=["GET"])
def health():
    """GET /api/health – Simple health-check endpoint."""
    return jsonify({"status": "ok", "service": "EduMentor AI"})
