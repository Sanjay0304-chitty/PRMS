import { useState, useCallback, memo } from 'react';
import {
  ChevronRight, ChevronDown, Globe, Layout, Type,
  Image as ImageIcon, Menu as MenuIcon, Settings2,
  ChevronUp, FolderOpen, FileText, Monitor,
  Smartphone, Tablet, Layers
} from 'lucide-react';
import { motion } from 'framer-motion';

/* ---- Tree node definitions matching the reference design ---- */
const buildTree = () => [
  {
    id: 'body', label: 'Body', icon: <Monitor size={14} />, expandable: true,
    children: [
      { id: 'theme_background_color', label: 'Background', icon: <ImageIcon size={14} /> },
      { id: 'theme_text_color', label: 'Text Color', icon: <Type size={14} /> },
    ],
  },
  {
    id: 'header', label: 'Header', icon: <MenuIcon size={14} />, expandable: true,
    children: [
      { id: 'header_background_color', label: 'Background', icon: <ImageIcon size={14} /> },
      { id: 'branding_site_name', label: 'Site Name', icon: <Type size={14} /> },
      { id: 'branding_logo_url', label: 'Logo', icon: <ImageIcon size={14} /> },
      { id: 'branding_company_name', label: 'Company Name', icon: <Type size={14} /> },
    ],
  },
  {
    id: 'hero', label: 'Hero', icon: <ImageIcon size={14} />, expandable: true,
    children: [
      { id: 'hero_title', label: 'Title', icon: <Type size={14} /> },
      { id: 'hero_subtitle', label: 'Description', icon: <Type size={14} /> },
      { id: 'hero_cta', label: 'CTA Button', icon: <Layout size={14} /> },
      { id: 'hero_image', label: 'Image', icon: <ImageIcon size={14} /> },
      { id: 'hero_background', label: 'Background', icon: <ImageIcon size={14} /> },
    ],
  },
  {
    id: 'search_bar', label: 'Search Bar', icon: <Settings2 size={14} />, expandable: true,
    children: [
      { id: 'search_placeholder', label: 'Placeholder', icon: <Type size={14} /> },
      { id: 'search_button', label: 'Button', icon: <Layout size={14} /> },
    ],
  },
  {
    id: 'featured', label: 'Featured Properties', icon: <Layers size={14} />, expandable: true,
    children: [
      { id: 'featured_title', label: 'Section Title', icon: <Type size={14} /> },
      { id: 'featured_cards', label: 'Property Cards', icon: <Layout size={14} /> },
    ],
  },
  {
    id: 'features', label: 'Features', icon: <Layout size={14} />, expandable: true,
    children: [
      { id: 'features_title', label: 'Section Title', icon: <Type size={14} /> },
      { id: 'features_grid', label: 'Feature Grid', icon: <Layout size={14} /> },
    ],
  },
  {
    id: 'testimonials', label: 'Testimonials', icon: <Layers size={14} />, expandable: true,
    children: [
      { id: 'testimonials_title', label: 'Section Title', icon: <Type size={14} /> },
      { id: 'testimonials_cards', label: 'Testimonial Cards', icon: <Layout size={14} /> },
    ],
  },
  {
    id: 'about', label: 'About', icon: <FileText size={14} />, expandable: true,
    children: [
      { id: 'homepage_about_title', label: 'Title', icon: <Type size={14} /> },
      { id: 'homepage_about_description', label: 'Description', icon: <Type size={14} /> },
    ],
  },
  {
    id: 'cta_section', label: 'CTA Section', icon: <Layout size={14} />, expandable: true,
    children: [
      { id: 'cta_title', label: 'Title', icon: <Type size={14} /> },
      { id: 'cta_button', label: 'Button', icon: <Layout size={14} /> },
    ],
  },
  {
    id: 'footer', label: 'Footer', icon: <ChevronUp size={14} />, expandable: true,
    children: [
      { id: 'footer_background_color', label: 'Background', icon: <ImageIcon size={14} /> },
      { id: 'footer_copyright_text', label: 'Copyright Text', icon: <Type size={14} /> },
    ],
  },
];

const TREE = buildTree();

const TreeNode = memo(function TokenTreeNode({ node, depth, selectedId, onSelect }) {
  const [expanded, setExpanded] = useState(true);
  const isSelected = selectedId === node.id;
  const paddingLeft = depth * 12 + 12;
  const style = useMemo(() => ({ paddingLeft: `${paddingLeft}px` }), [paddingLeft]);

  const handleClick = useCallback(() => {
    if (node.expandable) {
      setExpanded((v) => !v);
    }
    onSelect(node.id);
  }, [node.id, node.expandable, onSelect]);

  return (
    <div>
      <div
        className={`pt-row ${isSelected ? 'pt-row-active' : ''}`}
        style={style}
        onClick={handleClick}
      >
        {node.expandable && (
          <span className="pt-chevron">
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        )}
        <span className="pt-icon">{node.icon}</span>
        <span className="pt-label">{node.label}</span>
      </div>
      {expanded && node.children?.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function SearchInput({ value, onChange }) {
  return (
    <div className="pt-search-wrap">
      <input
        type="text"
        placeholder="Filter..."
        className="pt-search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export const PageTree = memo(function PageTree({ selectedId, onSelect }) {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!filter) return TREE;
    const lower = filter.toLowerCase();
    return TREE.filter((group) => {
      return (
        group.label.toLowerCase().includes(lower) ||
        group.children?.some((c) => c.label.toLowerCase().includes(lower))
      );
    });
  }, [filter]);

  return (
    <div className="pt-sidebar">
      <div className="pt-header">
        <span className="pt-header-icon"><Globe size={16} /></span>
        <span className="pt-header-title">Pages</span>
      </div>

      <div className="pt-tree-header">
        <span className="pt-tree-label">Hero - Homepage</span>
      </div>

      <SearchInput value={filter} onChange={setFilter} />

      <div className="pt-tree">
        {filtered.map((group) => (
          <TreeNode
            key={group.id}
            node={group}
            depth={0}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* Page tabs at bottom */}
      <div className="pt-tabs">
        <button className="pt-tab active">
          <FileText size={12} />
          <span>Page 1</span>
        </button>
      </div>
    </div>
  );
});
