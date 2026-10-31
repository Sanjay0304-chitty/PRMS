import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { adminApi } from '../api/admin';

const CustomizationContext = createContext(null);

export function CustomizationProvider({ children }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [editingTheme, setEditingTheme] = useState('light');
  const [draftConfig, setDraftConfig] = useState({ light: {}, dark: {} });
  const [historyPast, setHistoryPast] = useState([]);
  const [historyFuture, setHistoryFuture] = useState([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  /* ---- Live CSS variable injection from draftConfig ---- */
  useEffect(() => {
    const root = document.documentElement;
    const current = draftConfig[editingTheme] || {};

    // Collect all CSS variables to inject
    const variables = [];
    for (const [customizeId, styles] of Object.entries(current)) {
      for (const [prop, value] of Object.entries(styles)) {
        // Map camelCase CSS properties to CSS custom property names
        const cssVarKey = `--cz-${customizeId}-${prop}`;
        variables.push([cssVarKey, value]);
        root.style.setProperty(cssVarKey, value);
      }
    }

    // Apply inline styles directly to ALL matching [data-customize-id] elements
    // Use querySelectorAll so shared IDs (e.g. global.header, global.sidebar)
    // apply across every layout on the page simultaneously
    if (editingTheme === 'light') {
      for (const [customizeId, styles] of Object.entries(current)) {
        const elements = document.querySelectorAll(`[data-customize-id="${customizeId}"]`);
        elements.forEach((el) => {
          for (const [prop, value] of Object.entries(styles)) {
            el.style[prop] = value;
          }
        });
      }
    }
  }, [draftConfig, editingTheme]);

  /* ---- Update element style (mutates draftConfig with undo/redo support) ---- */
  const updateElementStyle = useCallback((customizeId, themeKey, styles) => {
    setHistoryPast(prev => [...prev.slice(-19), JSON.parse(JSON.stringify(draftConfig))]);
    setHistoryFuture([]);
    setDraftConfig(prev => ({
      ...prev,
      [themeKey]: {
        ...prev[themeKey],
        [customizeId]: {
          ...prev[themeKey]?.[customizeId],
          ...styles,
        },
      },
    }));
  }, [draftConfig]);

  /* ---- Undo ----- */
  const undo = useCallback(() => {
    if (historyPast.length === 0) return false;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast(prev => prev.slice(0, -1));
    setHistoryFuture(prev => [JSON.parse(JSON.stringify(draftConfig)), ...prev]);
    setDraftConfig(previous);
    return true;
  }, [historyPast, draftConfig]);

  /* ---- Redo ----- */
  const redo = useCallback(() => {
    if (historyFuture.length === 0) return false;
    const next = historyFuture[0];
    setHistoryFuture(prev => prev.slice(1));
    setHistoryPast(prev => [...prev, JSON.parse(JSON.stringify(draftConfig))]);
    setDraftConfig(next);
    return true;
  }, [historyFuture, draftConfig]);

  /* ---- Reset selected element ---- */
  const resetElement = useCallback(() => {
    if (!selectedElement) return;
    const customizeId = selectedElement.id;
    setHistoryPast(prev => [...prev.slice(-19), JSON.parse(JSON.stringify(draftConfig))]);
    setHistoryFuture([]);

    setDraftConfig(prev => {
      const newLight = { ...prev.light };
      const newDark = { ...prev.dark };
      delete newLight[customizeId];
      delete newDark[customizeId];
      return { light: newLight, dark: newDark };
    });
  }, [selectedElement, draftConfig]);

  /* ---- Discard changes (reload draft from server) ---- */
  const discardChanges = useCallback(async () => {
    try {
      const response = await adminApi.getTheme();
      const data = response.data?.data || { light: {}, dark: {} };
      setDraftConfig({
        light: data.light || {},
        dark: data.dark || {},
      });
      setHistoryPast([]);
      setHistoryFuture([]);
    } catch {
      // If API fails, keep current draft
      console.warn('Failed to reload draft from server');
    }
  }, []);

  /* ---- Save draft to server ---- */
  const saveDraft = useCallback(async (themeId) => {
    setSaving(true);
    try {
      await adminApi.saveDraft(themeId, draftConfig.light, draftConfig.dark);
    } catch (err) {
      console.error('Failed to save draft:', err.message || err);
    } finally {
      setSaving(false);
    }
  }, [draftConfig]);

  /* ---- Publish theme ---- */
  const publish = useCallback(async (themeId) => {
    setPublishing(true);
    try {
      await adminApi.publishTheme(themeId);
    } catch (err) {
      console.error('Failed to publish theme:', err.message || err);
    } finally {
      setPublishing(false);
    }
  }, []);

  /* ---- Factory Reset (clear ALL customizations) ---- */
  const factoryReset = useCallback(() => {
    if (!window.confirm('Factory Reset: This will clear ALL customizations and restore the original theme. Continue?')) return;
    setDraftConfig({ light: {}, dark: {} });
    setHistoryPast([]);
    setHistoryFuture([]);
  }, []);

  return (
    <CustomizationContext.Provider
      value={{
        isEditMode,
        setIsEditMode,
        selectedElement,
        setSelectedElement,
        editingTheme,
        setEditingTheme,
        draftConfig,
        setDraftConfig,
        updateElementStyle,
        undo,
        redo,
        historyPast,
        historyFuture,
        resetElement,
        discardChanges,
        saveDraft,
        publish,
        saving,
        publishing,
        factoryReset,
      }}
    >
      {children}
    </CustomizationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCustomization = () => useContext(CustomizationContext);
