import { useState, useCallback, useRef, DragEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
  XCircle,
  Loader2,
  CheckCircle2,
  ImagePlus,
  AlertCircle,
  PlayCircle,
} from 'lucide-react';
import { propertyApi } from '../api';
import { getFullUrl } from '../config/apiBaseUrl';
import './ImageGallery.css';

const PLACEHOLDER_IMAGES = [
  'https://images.pexels.com/photos/190317/pexels-photo-190317.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/3762750/pexels-photo-3762750.jpeg?auto=compress&cs=tinysrgb&w=600',
];

function getImageUrl(img) {
  if (typeof img === 'string') return getFullUrl(img);
  if (img && img.url) {
    return getFullUrl(img.url);
  }
  if (img && img.path) return img.path;
  return '';
}

function getImageId(img) {
  if (typeof img === 'object' && img != null) {
    return img.id || img._id;
  }
  return null;
}

function isVideo(img) {
  return typeof img === 'object' && img != null && img.type === 'video';
}

function getThumbUrl(img) {
  if (isVideo(img)) {
    return img.thumbnailUrl ? getFullUrl(img.thumbnailUrl) : '';
  }
  return getImageUrl(img);
}

export default function ImageGallery({
  images,
  propertyId,
  userRole,
  onImagesChange,
  wrapperProps,
}) {
  const [mainIndex, setMainIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Check if user can edit images (Admin or Landlord)
  const canEdit = userRole === 'Admin' || userRole === 'Landlord' || userRole === 'admin' || userRole === 'landlord';

  // Use actual images or fallback to placeholders
  const displayImages = (images && images.length > 0) ? images : PLACEHOLDER_IMAGES;
  const mainImage = getImageUrl(displayImages[mainIndex]) || displayImages[0];
  const thumbnails = displayImages.slice(1, 8);

  /* ---------- Navigation ---------- */
  const goNext = useCallback(() => {
    setMainIndex((prev) => (prev < displayImages.length - 1 ? prev + 1 : 0));
  }, [displayImages.length]);

  const goPrev = useCallback(() => {
    setMainIndex((prev) => (prev > 0 ? prev - 1 : displayImages.length - 1));
  }, [displayImages.length]);

  /* ---------- File Upload ---------- */
  const processFiles = useCallback(
    async (files) => {
      const validFiles = Array.from(files).filter(
        (f) => f.type.startsWith('image/') && f.size < 10 * 1024 * 1024
      );
      if (validFiles.length === 0) {
        setUploadError('Please upload image files under 10 MB.');
        return;
      }
      setUploadError('');
      setUploading(true);
      setUploadSuccess(false);

      try {
        let lastImages = images;
        for (const file of validFiles) {
          const formData = new FormData();
          formData.append('image', file);
          const res = await propertyApi.addImage(propertyId, formData);
          // Refresh images — assume server returns updated list
          const newImg = res?.data?.data;
          if (newImg) {
            lastImages = [...(lastImages || []), newImg];
          }
        }
        setMainIndex(displayImages.length >= lastImages.length ? 0 : displayImages.length - lastImages.length);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
        onImagesChange?.(lastImages);
      } catch (err) {
        setUploadError(err.response?.data?.error?.message || err.message || 'Upload failed.');
        setTimeout(() => setUploadError(''), 4000);
      } finally {
        setUploading(false);
      }
    },
    [propertyId, images, displayImages.length, onImagesChange]
  );

  const handleFileSelect = useCallback(
    (e) => {
      processFiles(e.target.files);
      e.target.value = '';
    },
    [processFiles]
  );

  /* ---------- Drag & Drop ---------- */
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  /* ---------- File Upload Button Click ---------- */
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  /* ---------- Delete Image ---------- */
  const handleDelete = useCallback(
    async (img) => {
      const imageId = getImageId(img);
      if (!imageId) {
        setUploadError('Cannot delete placeholder images — upload your own first.');
        setTimeout(() => setUploadError(''), 3000);
        return;
      }
      try {
        await propertyApi.deleteImage(imageId);
        onImagesChange?.(
          (images || []).filter((i) => getImageId(i) !== imageId)
        );
        if (mainIndex >= (images || []).length - 1) {
          setMainIndex(Math.max(0, (images || []).length - 2));
        }
      } catch (err) {
        setUploadError(err.response?.data?.error?.message || err.message || 'Delete failed.');
        setTimeout(() => setUploadError(''), 4000);
      }
    },
    [propertyId, images, mainIndex, onImagesChange]
  );

  return (
    <div
      className={`property-image-gallery${dragOver ? ' gallery-drag-active' : ''}`}
      {...wrapperProps}
      onDrop={canEdit ? handleDrop : undefined}
      onDragOver={canEdit ? handleDragOver : undefined}
      onDragLeave={canEdit ? handleDragLeave : undefined}
    >
      {/* ── Hidden file input ── */}
      <input
        type="file"
        ref={fileInputRef}
        className="gallery-file-input"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
      />

      {/* ── Main image ── */}
      <div className="gallery-main">
        <AnimatePresence mode="wait">
          {mainImage && isVideo(displayImages[mainIndex]) ? (
            <motion.video
              key={mainImage || mainIndex}
              src={mainImage}
              controls
              className="gallery-main-img"
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.7 }}
              transition={{ duration: 0.35 }}
            />
          ) : mainImage ? (
            <motion.img
              key={mainImage || mainIndex}
              src={mainImage}
              alt="Property"
              className="gallery-main-img"
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.7 }}
              transition={{ duration: 0.35 }}
            />
          ) : (
            <motion.div
              key="no-img"
              className="gallery-main-fallback"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ImagePlus size={48} />
              <span>No images yet</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nav arrows */}
        {displayImages.length > 1 && (
          <>
            <button className="gallery-nav gallery-nav-prev" onClick={goPrev} aria-label="Previous image">
              <ChevronLeft size={22} />
            </button>
            <button className="gallery-nav gallery-nav-next" onClick={goNext} aria-label="Next image">
              <ChevronRight size={22} />
            </button>
          </>
        )}

        {/* Image counter badge */}
        <div className="gallery-counter">
          {displayImages.length > 1 && `${mainIndex + 1} / ${displayImages.length}`}
        </div>

        {/* Upload overlay (canEdit only, shows on hover) */}
        {canEdit && (
          <button className="gallery-upload-trigger" onClick={triggerFileInput} aria-label="Upload images">
            <Upload size={20} />
            {uploading ? <Loader2 size={16} className="spin-icon" /> : 'Upload'}
          </button>
        )}

        {/* Upload status */}
        <AnimatePresence>
          {uploadSuccess && (
            <motion.div
              className="gallery-toast gallery-toast-success"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
            >
              <CheckCircle2 size={16} />
              Image uploaded successfully
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {uploadError && (
            <motion.div
              className="gallery-toast gallery-toast-error"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
            >
              <AlertCircle size={16} />
              {uploadError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drag overlay */}
        {dragOver && (
          <motion.div
            className="gallery-drag-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Upload size={40} />
            <p>Drop images here</p>
          </motion.div>
        )}
      </div>

      {/* ── Thumbnails ── */}
      {thumbnails.length > 0 && (
        <div className="gallery-thumbnails">
          {thumbnails.map((img, idx) => {
            const thumbUrl = getThumbUrl(img);
            const video = isVideo(img);
            const isActive = idx === mainIndex - 1;
            const realId = getImageId(img);
            return (
              <div
                key={idx}
                className={`gallery-thumb${isActive ? ' gallery-thumb-active' : ''}`}
                onClick={() => setMainIndex(idx + 1)}
              >
                {thumbUrl ? (
                  <motion.img
                    src={thumbUrl}
                    alt={`View ${idx + 2}`}
                    className="gallery-thumb-img"
                    whileHover={{ scale: 1.04 }}
                    transition={{ duration: 0.2 }}
                  />
                ) : (
                  <div className="gallery-thumb-video-fallback">
                    <PlayCircle size={22} />
                  </div>
                )}
                {video && <PlayCircle size={16} className="gallery-thumb-video-badge" />}
                {/* Delete button on thumbnail */}
                {canEdit && realId && (
                  <button
                    className="gallery-thumb-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(img);
                    }}
                    aria-label={`Delete image ${idx + 2}`}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            );
          })}

          {/* Upload thumbnail placeholder */}
          {canEdit && (
            <button
              className="gallery-thumb gallery-thumb-upload"
              onClick={triggerFileInput}
              aria-label="Upload more images"
            >
              {uploading ? (
                <Loader2 size={24} className="spin-icon" />
              ) : (
                <Upload size={24} />
              )}
              <span>{uploading ? '...' : 'Add'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
