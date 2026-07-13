"""
EduMentor AI – app.py
Application factory using the Flask Blueprint pattern.
Loads environment variables, configures the app, and registers all blueprints.
"""

import os
import logging
from flask import Flask
from dotenv import load_dotenv

# Load .env into environment before anything else
load_dotenv()


def create_app() -> Flask:
    """
    Flask application factory.
    Returns a fully configured Flask application instance.
    """
    app = Flask(
        __name__,
        template_folder="templates",
        static_folder="static"
    )

    # ── Security & Configuration ─────────────────────────────────────────────
    app.config["SECRET_KEY"]        = os.getenv("SECRET_KEY", os.urandom(32).hex())
    app.config["DEBUG"]             = os.getenv("FLASK_DEBUG", "False").lower() == "true"
    app.config["JSON_SORT_KEYS"]    = False
    app.config["JSONIFY_PRETTYPRINT_REGULAR"] = False

    # ── Logging ──────────────────────────────────────────────────────────────
    log_level = logging.DEBUG if app.config["DEBUG"] else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # ── Register Blueprints ──────────────────────────────────────────────────
    from edumentor.blueprints.routes import main_bp
    app.register_blueprint(main_bp)

    app.logger.info("EduMentor AI application started successfully.")
    return app
