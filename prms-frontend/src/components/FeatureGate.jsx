import { useFeatureFlags } from '../contexts/FeatureFlagsContext';

export default function FeatureGate({ flag, children, fallback = null }) {
  const { isFeatureEnabled, loading } = useFeatureFlags();
  if (loading) return null;
  if (!isFeatureEnabled(flag)) return fallback;
  return children;
}