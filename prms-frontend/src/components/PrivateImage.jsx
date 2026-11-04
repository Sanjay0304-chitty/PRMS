import { forwardRef, useState } from 'react';
import { useMediaSource } from '../hooks/useMediaSource';

const unavailable = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#e5e7eb"/><text x="300" y="200" text-anchor="middle" fill="#4b5563" font-family="Arial" font-size="20">Image unavailable</text></svg>');

const PrivateImage = forwardRef(function PrivateImage({ src, alt = '', fallbackSources = [], onError, ...props }, ref) {
  const [attempt, setAttempt] = useState(null);
  const candidates = [src, ...fallbackSources].filter(Boolean);
  const index = attempt?.src === src ? attempt.index : 0;
  const { source, failed } = useMediaSource(candidates[index]);
  function handleError(event) {
    if (index + 1 < candidates.length) setAttempt({ src, index: index + 1 });
    else onError?.(event);
  }
  return <img {...props} ref={ref} alt={alt} src={failed || !candidates.length ? unavailable : source || undefined} onError={event => {
    if (index + 1 >= candidates.length) event.currentTarget.src = unavailable;
    handleError(event);
  }} />;
});

export default PrivateImage;
