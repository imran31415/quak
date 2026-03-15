import { useState, useRef } from 'react';
import type { ICellRendererParams } from 'ag-grid-community';
import { api } from '../../api/sheets';
import { IMAGE_MIME_TYPES, FILE_ACCEPTED_EXTENSIONS } from '@shared/constants';
import type { FileMetadata } from '@shared/types';
import { FilePreviewModal } from './FilePreviewModal';

function isImageFile(mimetype: string): boolean {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(mimetype);
}

function parseMetadata(value: unknown): FileMetadata | null {
  if (!value || value === '') return null;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (parsed && parsed.filename && parsed.originalName) return parsed as FileMetadata;
    return null;
  } catch {
    return null;
  }
}

export function FileCell(props: ICellRendererParams) {
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const metadata = parseMetadata(props.value);

  const triggerUpload = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await api.uploadFile(file);
      const json = JSON.stringify(result);
      setTimeout(() => {
        if (props.node && props.colDef?.field) {
          props.node.setDataValue(props.colDef.field, json);
        }
      }, 0);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      // Reset so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (uploading) return;
    if (!metadata) {
      triggerUpload();
    } else {
      setPreviewOpen(true);
    }
  };

  const handleRemove = async () => {
    if (!metadata) return;
    try {
      await api.deleteFile(metadata.filename);
    } catch {
      // File may already be gone; proceed anyway
    }
    setTimeout(() => {
      if (props.node && props.colDef?.field) {
        props.node.setDataValue(props.colDef.field, '');
      }
    }, 0);
    setPreviewOpen(false);
  };

  const handleReplace = () => {
    setPreviewOpen(false);
    setTimeout(() => triggerUpload(), 100);
  };

  const accept = FILE_ACCEPTED_EXTENSIONS.join(',');

  if (uploading) {
    return (
      <div className="flex items-center h-full px-2 text-gray-400 dark:text-gray-500 text-xs" data-testid="file-cell-uploading">
        Uploading...
      </div>
    );
  }

  if (!metadata) {
    return (
      <div
        className="flex items-center h-full px-2 cursor-pointer text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 text-xs gap-1"
        onClick={handleClick}
        data-testid="file-cell-empty"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Upload
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          data-testid="file-cell-input"
        />
      </div>
    );
  }

  const isImage = isImageFile(metadata.mimetype);

  return (
    <>
      <div
        className="flex items-center h-full px-2 cursor-pointer gap-1.5 text-xs overflow-hidden"
        onClick={handleClick}
        data-testid="file-cell-populated"
      >
        {isImage ? (
          <img
            src={`/api/uploads/${metadata.filename}`}
            alt={metadata.originalName}
            className="w-6 h-6 object-cover rounded flex-shrink-0"
            data-testid="file-cell-thumbnail"
          />
        ) : (
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} data-testid="file-cell-icon">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        )}
        <span className="truncate text-gray-700 dark:text-gray-300">{metadata.originalName}</span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          data-testid="file-cell-input"
        />
      </div>
      {previewOpen && (
        <FilePreviewModal
          metadata={metadata}
          onClose={() => setPreviewOpen(false)}
          onRemove={handleRemove}
          onReplace={handleReplace}
        />
      )}
    </>
  );
}
