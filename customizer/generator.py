"""
HTML/CSS generator for the Website Customizer page.

Accepts a :class:`CustomizationConfig` (the five elements) and produces:
  - Header HTML + CSS
  - Body HTML + CSS
  - Footer HTML + CSS
  - A full page combining all three
"""

from __future__ import annotations

from html import escape
from typing import Optional

from .models import CustomizationConfig


# ---------- CSS defaults (from ui-spec.md) ----------

_DEFAULTS_CSS = """\
:root {
    --header-height: 60px;
    --content-height: 80vh;
    --footer-height: 40px;
    --color-primary: #2563EB;
    --color-secondary: #6B7280;
    --color-text: #1F2937;
    --font-size-base: 16px;
    --font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
"""


# ---------- per-section generators ----------

def generate_header_css(
    background_color: str = '#FFFFFF',
    logo_max_height: int = 40,
) -> str:
    """Generate CSS for the header section."""
    return (
        f"/* ---- Header ---- */\n"
        f"header.header {{\n"
        f"    height: var(--header-height);\n"
        f"    background-color: {escape(background_color)};\n"
        f"    display: flex;\n"
        f"    align-items: center;\n"
        f"    padding: 0 16px;\n"
        f"    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);\n"
        f"}}\n"
        f"\n"
        f"header.header .logo {{\n"
        f"    display: flex;\n"
        f"    align-items: center;\n"
        f"    gap: 8px;\n"
        f"}}\n"
        f"\n"
        f"header.header .logo img {{\n"
        f"    max-height: {logo_max_height}px;\n"
        f"    object-fit: contain;\n"
        f"}}\n"
        f"\n"
        f"header.header .brand-name {{\n"
        f"    font-weight: 700;\n"
        f"    font-size: 1.25rem;\n"
        f"    color: var(--color-text);\n"
        f"}}\n"
    )


def generate_header_html(
    title: str,
    logo_url: str,
    company_name: str,
) -> str:
    """Generate HTML for the header section."""
    lines = [
        '<header class="header" role="banner">',
        '  <div class="logo">',
    ]
    if logo_url:
        lines.append(f'    <img src="{escape(logo_url)}" alt="{escape(company_name)} logo" />')
    lines.extend([
        f'    <span class="brand-name">{escape(title)}</span>',
        '  </div>',
        '  <nav class="nav" role="navigation"></nav>',
        '</header>',
    ])
    return '\n'.join(lines)


def generate_body_css(
    background_color: str,
) -> str:
    """Generate CSS for the body/content section."""
    return (
        f"/* ---- Body ---- */\n"
        f"main.body {{\n"
        f"    min-height: var(--content-height);\n"
        f"    background-color: {escape(background_color)};\n"
        f"    padding: 24px 16px;\n"
        f"    overflow-y: auto;\n"
        f"}}\n"
        f"\n"
        f"main.body .content-container {{\n"
        f"    max-width: 960px;\n"
        f"    margin: 0 auto;\n"
        f"}}\n"
        f"\n"
        f"main.body h1 {{\n"
        f"    font-size: 1.75rem;\n"
        f"    margin-bottom: 0.5em;\n"
        f"    color: var(--color-text);\n"
        f"}}\n"
        f"\n"
        f"main.body p.description {{\n"
        f"    color: var(--color-secondary);\n"
        f"    line-height: 1.6;\n"
        f"}}\n"
    )


def generate_body_html(
    title: str,
    description: str,
) -> str:
    """Generate HTML for the body/content section."""
    lines = [
        '<main class="body" role="main">',
        '  <div class="content-container">',
        f'    <h1>{escape(title)}</h1>',
    ]
    if description:
        lines.append(f'    <p class="description">{escape(description)}</p>')
    lines.extend([
        '  </div>',
        '</main>',
    ])
    return '\n'.join(lines)


def generate_footer_css(
    background_color: str = '#F3F4F6',
) -> str:
    """Generate CSS for the footer section."""
    return (
        f"/* ---- Footer ---- */\n"
        f"footer.footer {{\n"
        f"    min-height: var(--footer-height);\n"
        f"    background-color: {escape(background_color)};\n"
        f"    display: flex;\n"
        f"    flex-direction: column;\n"
        f"    align-items: center;\n"
        f"    justify-content: center;\n"
        f"    padding: 8px 16px;\n"
        f"}}\n"
        f"\n"
        f"footer.footer .contact-links {{\n"
        f"    display: flex;\n"
        f"    gap: 12px;\n"
        f"    margin-bottom: 4px;\n"
        f"}}\n"
        f"\n"
        f"footer.footer .copyright {{\n"
        f"    font-size: 9px;\n"
        f"    color: var(--color-secondary);\n"
        f"    text-align: center;\n"
        f"}}\n"
    )


def generate_footer_html(
    company_name: str,
    year: Optional[int] = None,
) -> str:
    """Generate HTML for the footer section."""
    if year is None:
        from datetime import datetime
        year = datetime.now().year

    lines = [
        f'<footer class="footer" role="contentinfo">',
        f'  <nav class="contact-links"></nav>',
        f'  <p class="copyright">&copy; {year} {escape(company_name)}. All rights reserved.</p>',
        f'</footer>',
    ]
    return '\n'.join(lines)


# ---------- combined / full-page ----------

def generate_full_css(
    config: CustomizationConfig,
    footer_bg: Optional[str] = None,
) -> str:
    """Return the complete CSS string for the themed page."""
    header_css = generate_header_css()
    body_css = generate_body_css(config.background_color)
    footer_bg = footer_bg or 'var(--footer-height)'
    footer_css = generate_footer_css(footer_bg)
    return _DEFAULTS_CSS + header_css + body_css + footer_css


def generate_full_html(
    config: CustomizationConfig,
    include_css_tag: bool = True,
) -> str:
    """
    Return a complete HTML document string with header, body, and footer.

    If *include_css_tag* is True (default), the generated CSS is injected
    inside a ``<style>`` block in the ``<head>``.
    """
    header = generate_header_html(config.title, config.logo_url, config.company_name)
    body = generate_body_html(config.title, config.description)
    footer = generate_footer_html(config.company_name)

    css_part = ''
    if include_css_tag:
        css = generate_full_css(config)
        css_part = f'<style>\n{css}</style>'

    page = (
        '<!DOCTYPE html>\n'
        '<html lang="en">\n'
        '<head>\n'
        '<meta charset="UTF-8" />\n'
        f'<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n'
        f'<title>{escape(config.title)}</title>\n'
        f'{css_part}\n'
        '</head>\n'
        '<body>\n'
        f'{header}\n{body}\n{footer}\n'
        '</body>\n'
        '</html>'
    )
    return page


# ---------- convenience wrapper ----------

def generate_html(
    title: str = 'PRMS',
    description: str = 'Property Rental Management System',
    background_color: str = '#F3F6FB',
    logo_url: str = '',
    company_name: str = 'Property Rental Management System',
) -> str:
    """One-shot helper that takes the five elements and returns the page HTML.

    This is the primary public function – it wraps everything into one
    convenient call matching the task specification.
    """
    config = CustomizationConfig(
        title=title,
        description=description,
        background_color=background_color,
        logo_url=logo_url,
        company_name=company_name,
    )
    return generate_full_html(config)
