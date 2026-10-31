"""
Customizer data models.

Represents the five critical customization elements for the website
customizer page:
  1. title           – Page/site title text
  2. description     – Tagline / subtitle shown under the title
  3. background_color – Page background colour (hex string)
  4. logo_url        – URL pointing to the logo image
  5. company_name    – Legal company / organisation name

Each field can be validated individually and as part of the full model.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional


# ---------- validation helpers ----------

_HEX_RE = re.compile(r'^#[0-9a-fA-F]{3,8}$')
_URL_RE = re.compile(
    r'^(https?:\/\/)'                            # scheme
    r'(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)*'  # domain
    r'[a-zA-Z]{2,}'                              # TLD
    r'(?:\/[#\?\w\-._~:\/\[\]@!$&\'()*+,;=]*)?$',        # path/query/fragment  # noqa: E501
    re.ASCII
)
_MAX_TITLE_LEN = 128
_MAX_DESCRIPTION_LEN = 512
_MAX_COMPANY_NAME_LEN = 128


def validate_title(value: str) -> Optional[str]:
    """Return an error string for *value*, or None when valid."""
    if not value or not value.strip():
        return 'title must not be empty'
    if len(value.strip()) > _MAX_TITLE_LEN:
        return f'title must be at most {_MAX_TITLE_LEN} characters'
    return None


def validate_description(value: str) -> Optional[str]:
    """Return an error string for *value*, or None when valid."""
    # Description is optional but length-capped.
    if value and len(value) > _MAX_DESCRIPTION_LEN:
        return f'description must be at most {_MAX_DESCRIPTION_LEN} characters'
    return None


def validate_background_color(value: str) -> Optional[str]:
    """Return an error string for *value*, or None when valid hex colour."""
    if not _HEX_RE.match(value):
        return 'background_color must be a valid hex colour (e.g. #FFF, #112233, #AABBCCDD)'
    return None


def validate_logo_url(value: str) -> Optional[str]:
    """Return an error string for *value*, or None when valid URL."""
    if not value:
        return 'logo_url is required'
    if not _URL_RE.match(value):
        return 'logo_url must be a valid HTTP(S) URL'
    return None


def validate_company_name(value: str) -> Optional[str]:
    """Return an error string for *value*, or None when valid."""
    if not value or not value.strip():
        return 'company_name must not be empty'
    if len(value.strip()) > _MAX_COMPANY_NAME_LEN:
        return f'company_name must be at most {_MAX_COMPANY_NAME_LEN} characters'
    return None


# ---------- model ----------

@dataclass
class CustomizationConfig:
    """Configuration carrying the five customization elements."""

    title: str = 'PRMS'
    description: str = 'Property Rental Management System'
    background_color: str = '#F3F6FB'
    logo_url: str = ''
    company_name: str = 'Property Rental Management System'

    @classmethod
    def from_dict(cls, data: dict) -> 'CustomizationConfig':
        """Construct from a plain dict, applying defaults for missing keys."""
        return cls(
            title=str(data.get('title', 'PRMS')),
            description=str(data.get('description', 'Property Rental Management System')),
            background_color=str(data.get('background_color', '#F3F6FB')),
            logo_url=str(data.get('logo_url', '')),
            company_name=str(data.get('company_name', 'Property Rental Management System')),
        )

    # ---- validation ----

    def validate(self) -> list[str]:
        """Validate all fields and return a list of error strings."""
        errors: list[str] = []
        field_validators = {
            'title': validate_title,
            'description': validate_description,
            'background_color': validate_background_color,
            'logo_url': validate_logo_url,
            'company_name': validate_company_name,
        }
        for fname, validator in field_validators.items():
            err = validator(getattr(self, fname))
            if err:
                errors.append(err)
        return errors

    @property
    def is_valid(self) -> bool:
        return len(self.validate()) == 0
