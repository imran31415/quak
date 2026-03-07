import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ICellEditorParams } from 'ag-grid-community';

export const DatePickerEditor = forwardRef((props: ICellEditorParams, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(() => {
    const v = props.value;
    if (!v) return '';
    // Convert to YYYY-MM-DD format for input[type=date]
    try {
      const d = new Date(v);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useImperativeHandle(ref, () => ({
    getValue() {
      return value || null;
    },
    isCancelBeforeStart() {
      return false;
    },
    isCancelAfterEnd() {
      return false;
    },
  }));

  return (
    <input
      ref={inputRef}
      type="date"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="w-full h-full px-2 border-none outline-none bg-white"
      data-testid="date-picker-editor"
    />
  );
});

DatePickerEditor.displayName = 'DatePickerEditor';
