import { useState, useRef, useEffect } from 'react';
import { useCommentStore, type CellComment } from '../../store/commentStore';
import { useClickOutside } from '../../hooks/useClickOutside';

interface CellCommentPopoverProps {
  sheetId: string;
  rowId: number;
  columnId: string;
  position: { top: number; left: number };
  onClose: () => void;
}

export function CellCommentPopover({
  sheetId,
  rowId,
  columnId,
  position,
  onClose,
}: CellCommentPopoverProps) {
  const { getComment, addComment, updateComment, deleteComment } = useCommentStore();
  const existing = getComment(rowId, columnId);

  const [editing, setEditing] = useState(!existing);
  const [text, setText] = useState(existing?.text || '');
  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useClickOutside(popoverRef, onClose);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const handleSave = async () => {
    if (!text.trim()) return;
    if (existing) {
      await updateComment(sheetId, existing.id, text.trim());
    } else {
      await addComment(sheetId, rowId, columnId, text.trim());
    }
    setEditing(false);
  };

  const handleDelete = async () => {
    if (existing) {
      await deleteComment(sheetId, existing.id);
    }
    onClose();
  };

  return (
    <div
      ref={popoverRef}
      className="absolute z-50 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
      style={{ top: position.top, left: position.left }}
      data-testid="comment-popover"
    >
      <div className="p-3">
        {editing ? (
          <>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a comment..."
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 resize-none"
              rows={3}
              data-testid="comment-textarea"
            />
            <div className="flex justify-end gap-1 mt-2">
              <button
                onClick={onClose}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                data-testid="comment-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!text.trim()}
                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
                data-testid="comment-save"
              >
                Save
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap" data-testid="comment-text">
              {existing?.text}
            </p>
            <div className="flex justify-end gap-1 mt-2">
              <button
                onClick={() => {
                  setEditing(true);
                  setText(existing?.text || '');
                }}
                className="px-2 py-1 text-xs text-blue-500 hover:text-blue-700"
                data-testid="comment-edit"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="px-2 py-1 text-xs text-red-500 hover:text-red-700"
                data-testid="comment-delete"
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
