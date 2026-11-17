import { isSpaPagePath, isExplicitJsonRequest } from '../spaFallback';

describe('SPA Route & Content-Type Fallback', () => {
  test('identifies frontend SPA page routes', () => {
    expect(isSpaPagePath('/properties/my-townhouse-009')).toBe(true);
    expect(isSpaPagePath('/properties')).toBe(true);
    expect(isSpaPagePath('/admin/dashboard')).toBe(true);
    expect(isSpaPagePath('/landlord/properties')).toBe(true);
    expect(isSpaPagePath('/tenant/properties/my-townhouse-009')).toBe(true);
  });

  test('excludes API endpoints, static uploads, and asset files', () => {
    expect(isSpaPagePath('/api/properties/my-townhouse-009')).toBe(false);
    expect(isSpaPagePath('/api/properties')).toBe(false);
    expect(isSpaPagePath('/health')).toBe(false);
    expect(isSpaPagePath('/uploads/properties/image.jpg')).toBe(false);
    expect(isSpaPagePath('/files/document.pdf')).toBe(false);
    expect(isSpaPagePath('/images/logo.png')).toBe(false);
    expect(isSpaPagePath('/assets/index-Dk2ycGU2.js')).toBe(false);
    expect(isSpaPagePath('/favicon.svg')).toBe(false);
  });

  test('correctly differentiates explicit JSON requests from browser page requests', () => {
    // Standard desktop and mobile Safari navigations
    expect(isExplicitJsonRequest('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8')).toBe(false);

    // Mobile webview, link preview, or wildcard accept
    expect(isExplicitJsonRequest('*/*')).toBe(false);
    expect(isExplicitJsonRequest(undefined)).toBe(false);
    expect(isExplicitJsonRequest('')).toBe(false);

    // Explicit API client requests
    expect(isExplicitJsonRequest('application/json')).toBe(true);
    expect(isExplicitJsonRequest('application/json, text/plain, */*')).toBe(true);
  });
});
