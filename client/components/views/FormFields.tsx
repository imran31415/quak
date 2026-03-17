import { useState, useCallback } from 'react';
import type { ColumnConfig, ValidationRule } from '@shared/types';

interface FormFieldsProps {
  columns: ColumnConfig[];
  linkedRecordOptions?: Record<string, Array<{ rowid: number; displayValue: string }>>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
}

interface FieldError {
  [columnId: string]: string;
}

function validateField(value: unknown, col: ColumnConfig): string | null {
  const rules = col.validationRules;
  if (!rules || rules.length === 0) return null;

  for (const rule of rules) {
    switch (rule.type) {
      case 'required':
        if (value === null || value === undefined || value === '') {
          return rule.message || 'This field is required';
        }
        break;
      case 'min_value': {
        const num = Number(value);
        const min = Number(rule.value);
        if (value !== '' && value !== null && !isNaN(num) && !isNaN(min) && num < min) {
          return rule.message || `Must be at least ${min}`;
        }
        break;
      }
      case 'max_value': {
        const num = Number(value);
        const max = Number(rule.value);
        if (value !== '' && value !== null && !isNaN(num) && !isNaN(max) && num > max) {
          return rule.message || `Must be at most ${max}`;
        }
        break;
      }
      case 'min_length': {
        const len = String(value || '').length;
        const min = Number(rule.value);
        if (!isNaN(min) && len < min) {
          return rule.message || `Must be at least ${min} characters`;
        }
        break;
      }
      case 'max_length': {
        const len = String(value || '').length;
        const max = Number(rule.value);
        if (!isNaN(max) && len > max) {
          return rule.message || `Must be at most ${max} characters`;
        }
        break;
      }
      case 'regex': {
        if (rule.value && value) {
          try {
            const regex = new RegExp(String(rule.value));
            if (!regex.test(String(value))) {
              return rule.message || 'Does not match required pattern';
            }
          } catch {
            // Invalid regex, skip
          }
        }
        break;
      }
    }
  }
  return null;
}

function convertValue(value: string | boolean, cellType: string): unknown {
  if (cellType === 'checkbox') return value;
  if (value === '') return null;
  if (cellType === 'number' || cellType === 'linked_record') {
    const num = Number(value);
    return isNaN(num) ? null : num;
  }
  return value;
}

export function FormFields({ columns, linkedRecordOptions, onSubmit }: FormFieldsProps) {
  // Filter out virtual columns
  const formColumns = columns.filter((c) => c.cellType !== 'formula' && c.cellType !== 'lookup');

  const initialValues: Record<string, string | boolean> = {};
  for (const col of formColumns) {
    initialValues[col.name] = col.cellType === 'checkbox' ? false : '';
  }

  const [values, setValues] = useState<Record<string, string | boolean>>(initialValues);
  const [errors, setErrors] = useState<FieldError>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = useCallback((colName: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [colName]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[colName];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: FieldError = {};
    for (const col of formColumns) {
      const error = validateField(values[col.name], col);
      if (error) newErrors[col.name] = error;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Convert values to proper types
    const converted: Record<string, unknown> = {};
    for (const col of formColumns) {
      converted[col.name] = convertValue(values[col.name], col.cellType);
    }

    setSubmitting(true);
    try {
      await onSubmit(converted);
      // Reset form on success
      setValues(initialValues);
      setErrors({});
    } finally {
      setSubmitting(false);
    }
  }, [values, formColumns, onSubmit, initialValues]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-fields">
      {formColumns.map((col) => (
        <div key={col.id} className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {col.name}
            {col.validationRules?.some((r: ValidationRule) => r.type === 'required') && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>
          {renderField(col, values[col.name], handleChange, linkedRecordOptions, columns, values)}
          {errors[col.name] && (
            <p className="text-sm text-red-500" data-testid={`form-error-${col.id}`}>{errors[col.name]}</p>
          )}
        </div>
      ))}
      <button
        type="submit"
        disabled={submitting}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        data-testid="form-submit-btn"
      >
        {submitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}

function renderField(
  col: ColumnConfig,
  value: string | boolean,
  onChange: (colName: string, value: string | boolean) => void,
  linkedRecordOptions?: Record<string, Array<{ rowid: number; displayValue: string }>>,
  allColumns?: ColumnConfig[],
  formValues?: Record<string, string | boolean>
) {
  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

  switch (col.cellType) {
    case 'number':
      return (
        <input
          type="number"
          value={value as string}
          onChange={(e) => onChange(col.name, e.target.value)}
          className={inputClass}
          data-testid={`form-field-${col.id}`}
          step="any"
        />
      );
    case 'checkbox':
      return (
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={value as boolean}
            onChange={(e) => onChange(col.name, e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            data-testid={`form-field-${col.id}`}
          />
        </div>
      );
    case 'dropdown': {
      let dropdownOptions = col.options || [];
      if (col.dependentOn && allColumns && formValues) {
        const parentCol = allColumns.find((c) => c.id === col.dependentOn!.columnId);
        if (parentCol) {
          const parentValue = formValues[parentCol.name];
          if (parentValue && typeof parentValue === 'string' && col.dependentOn.mapping[parentValue]) {
            dropdownOptions = col.dependentOn.mapping[parentValue];
          }
        }
      }
      return (
        <select
          value={value as string}
          onChange={(e) => onChange(col.name, e.target.value)}
          className={inputClass}
          data-testid={`form-field-${col.id}`}
        >
          <option value="">Select...</option>
          {dropdownOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }
    case 'date':
      return (
        <input
          type="date"
          value={value as string}
          onChange={(e) => onChange(col.name, e.target.value)}
          className={inputClass}
          data-testid={`form-field-${col.id}`}
        />
      );
    case 'markdown':
      return (
        <textarea
          value={value as string}
          onChange={(e) => onChange(col.name, e.target.value)}
          className={inputClass + ' min-h-[80px]'}
          data-testid={`form-field-${col.id}`}
          rows={3}
        />
      );
    case 'linked_record': {
      const options = linkedRecordOptions?.[col.id] || [];
      return (
        <select
          value={value as string}
          onChange={(e) => onChange(col.name, e.target.value)}
          className={inputClass}
          data-testid={`form-field-${col.id}`}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt.rowid} value={String(opt.rowid)}>{opt.displayValue}</option>
          ))}
        </select>
      );
    }
    default: // text
      return (
        <input
          type="text"
          value={value as string}
          onChange={(e) => onChange(col.name, e.target.value)}
          className={inputClass}
          data-testid={`form-field-${col.id}`}
        />
      );
  }
}
