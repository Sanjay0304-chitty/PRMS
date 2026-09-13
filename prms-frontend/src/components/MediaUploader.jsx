import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Video, FileText, Loader2, CheckCircle2, AlertCircle,
  Trash2, Download
} from 'lucide-react';
import { apiClient } from '../api/ApiClient';
import './MediaUploader.css';

const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
const DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/zip',
];

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_DOC_SIZE = 20 * 1024 * 1024; // 20 MB

function getFullUrl(url) {
  if (!url) return '';
  const base = import.meta.env.VITE_API_BASE_URL || window.location.origin || 'http://localhost:3500';
  return url.startsWith('http') ? url : `${base}${url}`;
}

/* ================= VIDEO UPLOADER ================= */
function VideoUploader({ propertyId, videos = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const processFiles = useCallback(
    async (files) => {
      const valid = Array.from(files).filter(
        (f) => VIDEO_TYPES.includes(f.type) && f.size <= MAX_VIDEO_SIZE
      );
      if (valid.length === 0) {
        setError('Please upload video files (MP4, MOV, WebM) under 100 MB.');
        return;
      }
      setError('');
      setUploading(true);
      setSuccess(false);

      try {
        const acc = [...videos];
        for (const file of valid) {
          const fd = new FormData();
          fd.append('video', file);
          const res = await apiClient.post(`/properties/${propertyId}/videos`, fd, {
            headers: { 'Content-Type': undefined },
          });
          const data = res?.data?.data;
          // The controller returns the updated property with videoUrls array
          if (data?.videoUrls?.length) {
            acc.length = 0;
            acc.push(...data.videoUrls);
          }
        }
        onChange?.(acc);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError(err.response?.data?.error?.message || err.message || 'Upload failed.');
        setTimeout(() => setError(''), 4000);
      } finally {
        setUploading(false);
      }
    },
    [propertyId, videos, onChange]
  );

  const handleDelete = useCallback(
    async (url) => {
      try {
        await apiClient.delete(`/properties/${propertyId}/videos?url=${encodeURIComponent(url)}`);
        onChange?.(videos.filter((v) => v !== url));
      } catch (e) { /* ignore */ }
    },
    [propertyId, videos, onChange]
  );

  return (
    <div className="media-uploader">
      <div className="media-header">
        <Video size={20} />
        <h4>Property Videos</h4>
      </div>

      <div
        className={`media-dropzone${dragOver ? ' media-drop-active' : ''}`}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          className="media-hidden-input"
          accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
          onChange={(e) => { processFiles(e.target.files); e.target.value = ''; }}
        />
        {uploading ? <Loader2 size={24} className="media-drop-icon spin-icon" /> : <Upload size={24} className="media-drop-icon" />}
        <span>Drop videos here or <strong>click to browse</strong></span>
        <small>MP4, MOV, WebM · Max 100 MB</small>
      </div>

      {videos.length > 0 && (
        <div className="media-grid">
          {videos.map((url, i) => (
            <div key={i} className="media-item media-video-item">
              <video src={getFullUrl(url)} className="media-thumb-video" controls preload="metadata" />
              <button
                className="media-delete"
                onClick={() => handleDelete(url)}
                title="Remove video"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {success && (
          <motion.div className="media-toast media-toast-success"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CheckCircle2 size={14} /> Video uploaded successfully
          </motion.div>
        )}
        {error && (
          <motion.div className="media-toast media-toast-error"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AlertCircle size={14} /> {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================= DOCUMENT UPLOADER ================= */
function DocumentUploader({ propertyId, documents = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const processFiles = useCallback(
    async (files) => {
      const valid = Array.from(files).filter(
        (f) => DOC_TYPES.includes(f.type) && f.size <= MAX_DOC_SIZE
      );
      if (valid.length === 0) {
        setError('Please upload documents (PDF, DOC, DOCX, TXT, ZIP) under 20 MB.');
        return;
      }
      setError('');
      setUploading(true);
      setSuccess(false);

      try {
        const acc = [...documents];
        for (const file of valid) {
          const fd = new FormData();
          fd.append('document', file);
          const res = await apiClient.post(`/properties/${propertyId}/documents`, fd, {
            headers: { 'Content-Type': undefined },
          });
          const data = res?.data?.data;
          if (data?.documentUrls?.length) {
            acc.length = 0;
            acc.push(...data.documentUrls);
          }
        }
        onChange?.(acc);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError(err.response?.data?.error?.message || err.message || 'Upload failed.');
        setTimeout(() => setError(''), 4000);
      } finally {
        setUploading(false);
      }
    },
    [propertyId, documents, onChange]
  );

  const handleDelete = useCallback(
    async (url) => {
      try {
        await apiClient.delete(`/properties/${propertyId}/documents?url=${encodeURIComponent(url)}`);
        onChange?.(documents.filter((d) => d !== url));
      } catch (e) { /* ignore */ }
    },
    [propertyId, documents, onChange]
  );

  const handleDownload = useCallback((url) => {
    const a = document.createElement('a');
    a.href = getFullUrl(url);
    a.download = url.split('/').pop();
    a.target = '_blank';
    a.click();
  }, []);

  return (
    <div className="media-uploader">
      <div className="media-header">
        <FileText size={20} />
        <h4>Property Documents</h4>
      </div>

      <div
        className={`media-dropzone${dragOver ? ' media-drop-active' : ''}`}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          className="media-hidden-input"
          accept=".pdf,.doc,.docx,.txt,.zip,application/pdf,application/msword,.txt,application/zip"
          onChange={(e) => { processFiles(e.target.files); e.target.value = ''; }}
        />
        {uploading ? <Loader2 size={24} className="media-drop-icon spin-icon" /> : <Upload size={24} className="media-drop-icon" />}
        <span>Drop documents or <strong>click to browse</strong></span>
        <small>PDF, DOC, DOCX, TXT, ZIP · Max 20 MB</small>
      </div>

      {documents.length > 0 && (
        <div className="media-grid media-doc-grid">
          {documents.map((url, i) => (
            <div key={i} className="media-item media-doc-item">
              <FileText size={28} className="media-doc-icon" />
              <span className="media-doc-name">{url.split('/').pop()}</span>
              <div className="media-doc-actions">
                <button className="media-action-btn media-action-download" onClick={() => handleDownload(url)} title="Download">
                  <Download size={14} />
                </button>
                <button className="media-action-btn media-action-delete" onClick={() => handleDelete(url)} title="Remove">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {success && (
          <motion.div className="media-toast media-toast-success"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CheckCircle2 size={14} /> Document uploaded successfully
          </motion.div>
        )}
        {error && (
          <motion.div className="media-toast media-toast-error"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AlertCircle size={14} /> {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { VideoUploader, DocumentUploader };
