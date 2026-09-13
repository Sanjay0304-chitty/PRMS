import { useEffect } from 'react';
import { useCustomization } from '../contexts/CustomizationContext';

export default function useElementPicker() {
  const { isEditMode, setSelectedElement } = useCustomization();

  useEffect(() => {
    if (!isEditMode) return;

    document.body.classList.add('customization-mode');

    const handlePointerEnter = (e) => {
      const target = e.target.closest('[data-customize-id]');
      if (target) target.classList.add('customization-hover');
    };

    const handlePointerLeave = (e) => {
      const target = e.target.closest('[data-customize-id]');
      if (target) target.classList.remove('customization-hover');
    };

    const handleClick = (e) => {
      const target = e.target.closest('[data-customize-id]');
      if (target) {
        e.stopPropagation();
        setSelectedElement({
          id: target.getAttribute('data-customize-id'),
          tag: target.tagName.toLowerCase(),
          computedStyle: getComputedStyle(target),
        });
      } else {
        setSelectedElement(null);
      }
    };

    document.addEventListener('pointerenter', handlePointerEnter, true);
    document.addEventListener('pointerleave', handlePointerLeave, true);
    document.addEventListener('click', handleClick, true);

    return () => {
      document.body.classList.remove('customization-mode');
      document.removeEventListener('pointerenter', handlePointerEnter, true);
      document.removeEventListener('pointerleave', handlePointerLeave, true);
      document.removeEventListener('click', handleClick, true);
    };
  }, [isEditMode, setSelectedElement]);
}
