import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useCallback } from 'react';

export default function Modal({
  isOpen,
  onOpenChange,
  title = '',
  children,
  footer = null,
  size = 'md',
  closeOnBackdrop = true,
}) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && isOpen) onOpenChange?.(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onOpenChange]);

  const handleBackdrop = useCallback(
    (e) => {
      if (e.target === e.currentTarget && closeOnBackdrop) onOpenChange?.(false);
    },
    [closeOnBackdrop, onOpenChange]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-backdrop"
          onClick={handleBackdrop}
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={`modal content-card mx-auto ${size === 'lg' ? 'w-[750px]' : size === 'xl' ? 'w-[1000px]' : 'w-[480px]'}`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <header className="modal-header">
              <h3 className="no-margin">{title}</h3>
              {typeof onOpenChange === 'function' && (
                <button className="btn-text close-btn" onClick={() => onOpenChange(false)}>Close</button>
              )}
            </header>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* CSS custom properties for the modal */
const style = document.createElement('style');
style.textContent = `
  .modal-backdrop {
    position: fixed; inset: 0;
    background: rgba(15, 23, 42, 0.55);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 2000; padding: 1rem;
  }
  .modal-header {
    display: flex; align-items: center; justify-content: space-between;
  }
  .modal-footer {
    display: flex; gap: 0.75rem; justify-content: flex-end; padding-top: 0.75rem;
  }
`;
if (!document.querySelector('style[data-modal-css]')) {
  style.setAttribute('data-modal-css', 'true');
  document.head.appendChild(style);
}