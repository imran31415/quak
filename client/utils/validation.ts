import type { CellType } from '@shared/constants';

interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateValue(
  value: unknown,
  cellType: CellType,
  options?: string[]
): ValidationResult {
  // Null/undefined/empty always valid (optional fields)
  if (value === null || value === undefined || value === '') {
    return { valid: true };
  }

  switch (cellType) {
    case 'number': {
      const num = Number(value);
      if (isNaN(num)) return { valid: false, error: 'Must be a number' };
      return { valid: true };
    }
    case 'date': {
      const str = String(value);
      if (isNaN(Date.parse(str))) return { valid: false, error: 'Invalid date format' };
      return { valid: true };
    }
    case 'checkbox': {
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false' && value !== 0 && value !== 1) {
        return { valid: false, error: 'Must be true or false' };
      }
      return { valid: true };
    }
    case 'dropdown': {
      if (options && options.length > 0 && !options.includes(String(value))) {
        return { valid: false, error: `Must be one of: ${options.join(', ')}` };
      }
      return { valid: true };
    }
    case 'text':
    case 'markdown':
    case 'formula':
    default:
      return { valid: true };
  }
}
