"""
Flask API server for the Website Customizer.

Exposes the five critical customization elements via REST endpoints:
  1. title           – Page/site title text
  2. description     – Tagline / subtitle shown under the title
  3. background_color – Page background colour (hex string)
  4. logo_url        – URL pointing to the logo image
  5. company_name    – Legal company / organisation name

Endpoints:
  GET /api/customizer          – Read current configuration
  PUT /api/customizer          – Update all five elements at once
  PATCH /api/customizer/<field> – Update a single element
  GET /api/customizer/generate-html – Get a rendered HTML preview
  POST /api/customizer/reset  – Reset all elements to defaults
"""

from __future__ import annotations

import json
import os
from http import HTTPStatus
from pathlib import Path
from typing import Any

from flask import Blueprint, Response, abort, jsonify, request
from jinja2 import Template

import sys
import os

# Ensure parent directory is on path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from customizer.models import (
    CustomizationConfig,
    validate_background_color,
    validate_company_name,
    validate_description,
    validate_logo_url,
    validate_title,
)
from customizer.generator import generate_full_html

# ---------------------------------------------------------------------------
# In-memory store (replace with DB in production)
# ---------------------------------------------------------------------------

_store_path = Path(__file__).parent / "store.json"


def _load_store() -> dict[str, Any]:
    """Load customisation config from store.json."""
    if _store_path.exists():
        raw = _store_path.read_text(encoding="utf-8")
        return json.loads(raw)
    return {
        "title": "PRMS",
        "description": "Property Rental Management System",
        "background_color": "#F3F6FB",
        "logo_url": "",
        "company_name": "Property Rental Management System",
    }


def _save_store(store: dict) -> None:
    """Save customisation config to store.json."""
    _store_path.write_text(json.dumps(store, indent=2), encoding="utf-8")


# Module-level store (warming on first import)
_store: dict[str, Any] = _load_store()


# ---------------------------------------------------------------------------
# Flask blueprint
# ---------------------------------------------------------------------------

customizer_bp = Blueprint("customizer", __name__, url_prefix="/api/customizer")

# ---------------------------------------------------------------------------
# Field-level validation maps
# ---------------------------------------------------------------------------

_VALIDATORS: dict[str, Any] = {
    "title": validate_title,
    "description": validate_description,
    "background_color": validate_background_color,
    "logo_url": validate_logo_url,
    "company_name": validate_company_name,
}

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@customizer_bp.route("", methods=["GET"])
def get_customizer_config() -> Response:
    """GET current customization config."""
    store = _load_store()
    return jsonify(store), HTTPStatus.OK


@customizer_bp.route("", methods=["PUT"])
def update_customizer_config() -> Response:
    """PUT update all five customization elements."""
    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({"error": "Request body required (JSON)"}), HTTPStatus.BAD_REQUEST

    # Merge into store
    for key in ("title", "description", "background_color", "logo_url", "company_name"):
        if key in payload:
            _store[key] = payload[key]

    _save_store(_store)
    return jsonify(_store), HTTPStatus.OK


@customizer_bp.route("/<field>", methods=["PATCH"])
def patch_customizer_field(field: str) -> Response:
    """PATCH a single customization element."""
    if field not in _VALIDATORS:
        return jsonify({"error": f"Unknown field: {field}"}), HTTPStatus.BAD_REQUEST

    if field not in _store:
        return jsonify({"error": f"Field not found: {field}"}), HTTPStatus.NOT_FOUND

    payload = request.get_json(silent=True) or {}
    value = payload.get(field)

    if value is not None:
        error = _VALIDATORS[field](value)
        if error:
            return jsonify({"field": field, "error": error, "value": value}), HTTPStatus.BAD_REQUEST
        _store[field] = value
        _save_store(_store)

    return jsonify({field: _store[field]}), HTTPStatus.OK


@customizer_bp.route("/generate-html", methods=["GET"])
def generate_html_preview() -> Response:
    """GET a rendered HTML page preview using the current config."""
    store = _load_store()
    config = CustomizationConfig(
        title=store.get("title", "PRMS"),
        description=store.get("description", "Property Rental Management System"),
        background_color=store.get("background_color", "#F3F6FB"),
        logo_url=store.get("logo_url", ""),
        company_name=store.get("company_name", "Property Rental Management System"),
    )
    html = generate_full_html(config)
    return Response(html, status=HTTPStatus.OK, content_type="text/html")


@customizer_bp.route("/reset", methods=["POST"])
def reset_customizer_config() -> Response:
    """POST reset all elements to their defaults."""
    defaults = {
        "title": "PRMS",
        "description": "Property Rental Management System",
        "background_color": "#F3F6FB",
        "logo_url": "",
        "company_name": "Property Rental Management System",
    }
    _store.update(defaults)
    _save_store(_store)
    return jsonify(_store), HTTPStatus.OK


@customizer_bp.route("/store", methods=["GET"])
def show_store_path() -> Response:
    """GET metadata about the current store."""
    if _store_path.exists():
        stat = _store_path.stat()
        return jsonify(
            path=str(_store_path),
            modified=stat.st_mtime,
            size=stat.st_size,
        )
    return jsonify(path=str(_store_path), modified=None, size=0)


# ---------------------------------------------------------------------------
# Top-level app for Flask CLI
# ---------------------------------------------------------------------------

from flask import Flask as FlaskApp

app = FlaskApp(__name__)
app.register_blueprint(customizer_bp)

# ---------------------------------------------------------------------------
# Run standalone  
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.debug = True
    app.run(port=5555)
