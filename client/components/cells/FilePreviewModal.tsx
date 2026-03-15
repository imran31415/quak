import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IMAGE_MIME_TYPES } from '@shared/constants';
import type { FileMetadata } from '@shared/types';

interface FilePreviewModalProps {
  metadata: FileMetadata;
  onClose: () => void;
  onRemove: () => void;
  onReplace: () => void;
}

function isImageFile(mimetype: string): boolean {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(mimetype);
}

export function FilePreviewModal({ metadata, onClose, onRemove, onReplace }: FilePreviewModalProps) {
  const fileUrl = `/api/uploads/${metadata.filename}`;
  const isImage = isImageFile(metadata.mimetype);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Non-image files: trigger download immediately
  useEffect(() => {
    if (!isImage) {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = metadata.originalName;
      a.click();
      onClose();
    }
  }, [isImage, fileUrl, metadata.originalName, onClose]);

  if (!isImage) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = metadata.originalName;
    a.click();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
      onClick={onClose}
      data-testid="file-preview-modal"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl max-h-[80vh] w-full mx-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
            {metadata.originalName}
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            data-testid="file-preview-close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Image */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
          <img
            src={fileUrl}
            alt={metadata.originalName}
            className="max-w-full max-h-[60vh] object-contain"
            data-testid="file-preview-image"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 p-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            data-testid="file-preview-download"
          >
            Download
          </button>
          <button
            onClick={onReplace}
            className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            data-testid="file-preview-replace"
          >
            Replace
          </button>
          <button
            onClick={onRemove}
            className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            data-testid="file-preview-remove"
          >
            Remove
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
