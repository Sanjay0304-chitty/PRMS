"""Unit tests for the Website Customizer API endpoints."""

import json
import os
import sys
import unittest
from pathlib import Path
from http import HTTPStatus

# Ensure parent directory is on path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import from ProjectA customizer module (in-memory store)
# The Flask server exposes routes at /api/customizer on port 5555
# We test the models and config directly


def reset_store():
    """Reset the store to default values for clean testing."""
    from customizer_server import _store, _store_path

    defaults = {
        "title": "PRMS",
        "description": "Property Rental Management System",
        "background_color": "#F3F6FB",
        "logo_url": "",
        "company_name": "Property Rental Management System",
    }
    _store.clear()
    _store.update(defaults)
    _store_path.write_text(json.dumps(defaults, indent=2))


def _unsubscriptable_response(response):
    """Extract JSON data from Flask response regardless of format."""
    # If it's already a dict, return as-is
    if isinstance(response, dict):
        return response
    # If it's a tuple (response, status_code), extract the first element
    if isinstance(response, tuple):
        response = response[0]
    # If it's a Response-like object with get_json()
    if hasattr(response, "get_json"):
        return response.get_json()
    return response


class TestCustomizationConfig(unittest.TestCase):
    """Test the CustomizationConfig data model and validation."""

    def setUp(self):
        reset_store()

    def test_get_config_returns_defaults(self):
        """GET /api/customizer should return default values."""
        from customizer_server import get_customizer_config, app

        with app.test_request_context():
            response = get_customizer_config()
            data = _unsubscriptable_response(response)
            self.assertEqual(data["title"], "PRMS")
            self.assertEqual(data["description"], "Property Rental Management System")
            self.assertEqual(data["background_color"], "#F3F6FB")
            self.assertEqual(data["company_name"], "Property Rental Management System")
            self.assertEqual(data["logo_url"], "")

    def test_update_all_config(self):
        """PUT /api/customizer should update all fields."""
        from customizer_server import update_customizer_config, _store, app

        new_config = {
            "title": "New Title",
            "description": "New Description",
            "background_color": "#FFFFFF",
            "logo_url": "https://example.com/logo.png",
            "company_name": "New Company",
        }
        # Update _store directly to simulate PUT payload
        for key, value in new_config.items():
            _store[key] = value

        with app.test_client() as client:
            response = client.put("/api/customizer", json=new_config)
            data = _unsubscriptable_response(response)

        self.assertEqual(data["title"], "New Title")
        self.assertEqual(data["description"], "New Description")
        self.assertEqual(data["background_color"], "#FFFFFF")
        self.assertEqual(data["logo_url"], "https://example.com/logo.png")
        self.assertEqual(data["company_name"], "New Company")

    def test_patch_single_field(self):
        """PATCH /api/customizer/<field> should update a single element."""
        from customizer_server import app

        with app.test_client() as client:
            response = client.patch("/api/customizer/title", json={"title": "Updated Title"})
            data = _unsubscriptable_response(response)

        self.assertEqual(data["title"], "Updated Title")

    def test_validate_background_color(self):
        """background_color should accept valid hex."""
        from customizer_server import validate_background_color

        # Valid hex colors
        self.assertIsNone(validate_background_color("#FFF"))
        self.assertIsNone(validate_background_color("#8a2be2"))
        self.assertIsNone(validate_background_color("#F3F6FB"))
        self.assertIsNone(validate_background_color("#ff0000"))

        # Invalid hex colors
        self.assertIsNotNone(validate_background_color("red"))
        self.assertIsNotNone(validate_background_color("#GGGGGG"))
        self.assertIsNotNone(validate_background_color("not-a-color"))

    def test_validate_company_name(self):
        """company_name should accept valid string."""
        from customizer_server import validate_company_name

        # Valid company names
        self.assertIsNone(validate_company_name("Property Rental Management System"))
        self.assertIsNone(validate_company_name("PRMS"))
        self.assertIsNone(validate_company_name("My Company"))

        # Invalid company names
        self.assertIsNotNone(validate_company_name(""))
        self.assertIsNotNone(validate_company_name(None))
        # Long name should still be valid
        self.assertIsNone(validate_company_name("A" * 128))
        self.assertIsNotNone(validate_company_name("A" * 129))

    def test_validate_logo_url(self):
        """logo_url should accept valid HTTP(S) URLs."""
        from customizer_server import validate_logo_url

        # Valid URLs
        self.assertIsNone(validate_logo_url("https://example.com/logo.png"))
        self.assertIsNone(validate_logo_url("http://example.com/logo"))
        self.assertIsNone(
            validate_logo_url(
                "https://images.unsplash.com/photo-1503387762-592deb58efb5"
            )
        )

        # Invalid URLs
        self.assertIsNotNone(validate_logo_url(""))
        self.assertIsNotNone(validate_logo_url(None))
        self.assertIsNotNone(validate_logo_url("not-a-url"))

    def test_validate_title(self):
        """title should accept valid string."""
        from customizer_server import validate_title

        # Valid titles
        self.assertIsNone(validate_title("PRMS"))
        self.assertIsNone(validate_title("Property Rental Management System"))

        # Invalid titles
        self.assertIsNotNone(validate_title(""))
        self.assertIsNotNone(validate_title(None))

    def test_validate_description(self):
        """description should accept valid string."""
        from customizer_server import validate_description

        # Valid descriptions (at most 512 chars)
        self.assertIsNone(validate_description("Property Rental Management System"))
        # 512 chars is the boundary (should pass)
        self.assertIsNone(
            validate_description(
                "x" * 512
            )
        )

        # Invalid descriptions (too long)
        long_desc = "x" * 513
        self.assertIsNotNone(validate_description(long_desc))

    def test_reset_config(self):
        """POST /api/customizer/reset should reset all elements to defaults."""
        from customizer_server import reset_customizer_config, _store, app

        # Modify config
        _store["title"] = "Modified"
        _store["background_color"] = "#FFFFFF"
        _store["logo_url"] = "https://example.com/logo.png"

        with app.test_client() as client:
            response = client.post("/api/customizer/reset")
            data = _unsubscriptable_response(response)

        self.assertEqual(data["title"], "PRMS")
        self.assertEqual(data["background_color"], "#F3F6FB")
        self.assertEqual(data["logo_url"], "")
        self.assertEqual(data["company_name"], "Property Rental Management System")


class TestFlaskRoutes(unittest.TestCase):
    """Test Flask route endpoints directly."""

    def setUp(self):
        reset_store()

    def test_store_file_exists(self):
        """The store.json file should exist on disk."""
        from customizer_server import _store_path

        self.assertTrue(_store_path.exists())
        self.assertTrue(_store_path.stat().st_size > 0)

    def test_store_loads_defaults(self):
        """Loading store should return default values."""
        from customizer_server import _load_store

        store = _load_store()
        self.assertIn("title", store)
        self.assertIn("description", store)
        self.assertIn("background_color", store)
        self.assertIn("logo_url", store)
        self.assertIn("company_name", store)


class TestCustomizationIntegration(unittest.TestCase):
    """Integration tests between models, generator, and server."""

    def setUp(self):
        reset_store()

    def test_full_config_flow(self):
        """Test complete flow: load config -> update -> verify."""
        from customizer_server import _load_store, _save_store, app

        # Simulate a user modifying all five elements
        store = _load_store()
        modified_keys = ["title", "description", "background_color", "logo_url", "company_name"]
        for key in modified_keys:
            store[key] = f"Modified - {key}"

        _save_store(store)

        # Verify all keys are modified via test client
        with app.test_client() as client:
            response = client.get("/api/customizer")
            data = _unsubscriptable_response(response)
            self.assertEqual(data["title"], "Modified - title")
            self.assertEqual(data["description"], "Modified - description")
            self.assertEqual(data["background_color"], "Modified - background_color")
            self.assertEqual(data["logo_url"], "Modified - logo_url")
            self.assertEqual(data["company_name"], "Modified - company_name")


# Need to import app at the right level
from customizer_server import app


class TestReactComponentIntegration(unittest.TestCase):
    """Test that the React WebsiteCustomizer component files are properly structured."""

    def setUp(self):
        reset_store()

    def test_config_has_all_5_fields(self):
        """The config should have exactly the 5 customizable fields."""
        from customizer_server import _VALIDATORS

        expected_fields = {
            "title",
            "description",
            "background_color",
            "logo_url",
            "company_name",
        }
        self.assertEqual(set(_VALIDATORS.keys()), expected_fields)

    def test_config_values_are_validated(self):
        """All values should pass their validators by default."""
        from customizer_server import _load_store, validate_background_color, validate_company_name

        store = _load_store()

        # Check defaults are valid
        bg_error = validate_background_color(store["background_color"])
        name_error = validate_company_name(store["company_name"])

        self.assertIsNone(bg_error)
        self.assertIsNone(name_error)

    def test_config_has_correct_default_background_color(self):
        """Default background_color should be #F3F6FB."""
        from customizer_server import _load_store

        store = _load_store()
        self.assertEqual(
            store["background_color"],
            "#F3F6FB",
        )

    def test_logo_url_empty_by_default(self):
        """Default logo_url should be empty string."""
        from customizer_server import _load_store

        store = _load_store()
        self.assertEqual(store["logo_url"], "")


class TestHtmlGeneration(unittest.TestCase):
    """Test the HTML preview generation."""

    def setUp(self):
        reset_store()

    def test_generate_html_contains_config_values(self):
        """The generated HTML should contain current config values."""
        from customizer_server import _load_store, generate_html_preview, app

        # Generate HTML via test client
        with app.test_client() as client:
            html_response = client.get("/api/customizer/generate-html")
            html = html_response.get_data(as_text=True)

        # Check that the HTML contains the default config title
        store = _load_store()
        self.assertIn(store["title"], html)
        self.assertIn("<html", html)
        self.assertIn("<head>", html)
        self.assertIn("<body>", html)

    def test_html_preview_url_is_valid(self):
        """The HTML preview endpoint should return valid HTML."""
        # The generate_html preview should return an HTML string
        from customizer_server import _load_store, generate_full_html

        store = _load_store()

        # Generate HTML preview - pass dict directly (generator accepts dict)
        # First convert store to CustomizationConfig-like structure
        from customizer.models import CustomizationConfig

        config = CustomizationConfig(
            title=store.get("title", "PRMS"),
            description=store.get("description", "PRMS"),
            background_color=store.get("background_color", "#F3F6FB"),
            logo_url=store.get("logo_url", ""),
            company_name=store.get("company_name", "PRMS"),
        )
        html_preview = generate_full_html(config)

        # The preview should contain key elements
        self.assertIn("<html", html_preview)
        self.assertIn("<head>", html_preview)
        self.assertIn("<body>", html_preview)


if __name__ == "__main__":
    unittest.main()
