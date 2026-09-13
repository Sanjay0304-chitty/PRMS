export interface CustomizerUpdateDto {
  company_name?: string;
  light_header_bg?: string;
  light_body_bg?: string;
  light_footer_bg?: string;
  light_accent_color?: string;
  dark_header_bg?: string;
  dark_body_bg?: string;
  dark_footer_bg?: string;
  dark_accent_color?: string;
  active_theme?: 'light' | 'dark';
}

export const HEX_RE = /^#([0-9a-fA-F]{3}){1,2}$|^#([0-9a-fA-F]{4}){1,2}$/;

export function validateHex(value: string): string | null {
  if (!HEX_RE.test(value)) {
    return 'Must be a valid hex color (e.g. #FFF, #112233)';
  }
  return null;
}
