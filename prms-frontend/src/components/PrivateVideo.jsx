import { useMediaSource } from '../hooks/useMediaSource';

export default function PrivateVideo({ url, ...props }) {
  const { source, failed } = useMediaSource(url);
  if (failed) return <span role="alert">Unable to load this video.</span>;
  return <video {...props} src={source || undefined} />;
}
