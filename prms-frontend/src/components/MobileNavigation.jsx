import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Menu, X, CircleHelp, LogOut } from 'lucide-react';
import './MobileNavigation.css';

export default function MobileNavigation({ items, activePage, prefix, onLogout }) {
  const dialog = useRef(null);
  const navigate = useNavigate();
  function go(path) {
    dialog.current.close();
    navigate(path);
  }
  return <>
    <button type="button" className="mobile-nav-trigger" aria-label="Open navigation" aria-haspopup="dialog" onClick={() => dialog.current.showModal()}>
      <Menu size={24} />
    </button>
    {createPortal(<dialog ref={dialog} className="mobile-nav-dialog" aria-label="Main navigation" onClick={event => {
      if (event.target === dialog.current) {
        const rect = dialog.current.getBoundingClientRect();
        if (event.clientX > rect.right || event.clientY > rect.bottom || event.clientY < rect.top) dialog.current.close();
      }
    }}>
      <div className="mobile-nav-heading"><strong>Navigation</strong><button type="button" aria-label="Close navigation" onClick={() => dialog.current.close()}><X size={24} /></button></div>
      <nav aria-label="Portal pages">
        {items.map(item => { const Icon = item.icon; return <button type="button" key={item.key} aria-current={activePage === item.key ? 'page' : undefined} onClick={() => go(item.path)}><Icon size={22} /><span>{item.label}</span></button>; })}
        {!items.some(item => item.key === 'help') && <button type="button" onClick={() => go(`${prefix}/help`)}><CircleHelp size={22} />Help</button>}
        <button type="button" onClick={() => { dialog.current.close(); onLogout(); }}><LogOut size={22} />Logout</button>
      </nav>
    </dialog>, document.body)}
  </>;
}
