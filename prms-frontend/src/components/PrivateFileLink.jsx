import { useState } from 'react';
import { getFullUrl } from '../config/apiBaseUrl';
import { openPrivateFile } from '../utils/privateFiles';

export default function PrivateFileLink({ url, children, ...props }) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  async function open(event) {
    event.preventDefault();
    if (opening) return;
    setOpening(true);
    setError('');
    try { await openPrivateFile(url); }
    catch (err) { setError(err.message); }
    finally { setOpening(false); }
  }
  return <>
    <a {...props} href={getFullUrl(url)} onClick={open} aria-busy={opening}>{opening ? 'Opening…' : children}</a>
    {error && <span role="alert" className="text-danger"> {error}</span>}
  </>;
}
