import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { motion } from 'framer-motion';

const DEVICES = [
  { id: 'desktop', label: 'Desktop', icon: <Monitor size={16} /> },
  { id: 'tablet', label: 'Tablet', icon: <Tablet size={16} /> },
  { id: 'mobile', label: 'Mobile', icon: <Smartphone size={16} /> },
];

const TAP_SCALE = { scale: 0.95 };

export default function PreviewToolbar({ device, onDeviceChange }) {
  return (
    <div className="pt-toolbar">
      {/* Left section: Page path / breadcrumb */}
      <div className="pt-toolbar-left">
        <span className="pt-breadcrumb">
          <span className="pt-breadcrumb-icon"><Monitor size={12} /></span>
          <span>http://localhost:3000</span>
        </span>
      </div>

      {/* Center: Device toggle */}
      <div className="pt-toolbar-center">
        {DEVICES.map((dev) => (
          <motion.button
            key={dev.id}
            type="button"
            className={`pt-device-btn ${device === dev.id ? 'pt-device-active' : ''}`}
            onClick={() => onDeviceChange(dev.id)}
            whileTap={TAP_SCALE}
            title={dev.label}
          >
            {dev.icon}
          </motion.button>
        ))}
      </div>

      {/* Right: zoom & other controls */}
      <div className="pt-toolbar-right">
        <span className="pt-zoom">100%</span>
      </div>
    </div>
  );
}
