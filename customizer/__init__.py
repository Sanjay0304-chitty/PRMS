"""Package entry points for the customizer module."""

from .models import (
    CustomizationConfig,
    validate_title,
    validate_description,
    validate_background_color,
    validate_logo_url,
    validate_company_name,
)  # noqa: F401

from .generator import (
    generate_header_css,
    generate_header_html,
    generate_body_css,
    generate_body_html,
    generate_footer_css,
    generate_footer_html,
    generate_full_css,
    generate_full_html,
    generate_html,
)  # noqa: F401

__all__ = [
    # models
    'CustomizationConfig',
    'validate_title',
    'validate_description',
    'validate_background_color',
    'validate_logo_url',
    'validate_company_name',
    # generator
    'generate_header_css',
    'generate_header_html',
    'generate_body_css',
    'generate_body_html',
    'generate_footer_css',
    'generate_footer_html',
    'generate_full_css',
    'generate_full_html',
    'generate_html',
]
