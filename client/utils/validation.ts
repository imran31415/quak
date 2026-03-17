import type { CellType } from '@shared/constants';
import type { ValidationRule, DependentDropdownConfig } from '@shared/types';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface DependentContext {
  dependentOn: DependentDropdownConfig;
  parentColumnName: string;
  rowData: Record<string, unknown>;
}

export function validateValue(
  value: unknown,
  cellType: CellType,
  options?: string[],
  validationRules?: ValidationRule[],
  dependentContext?: DependentContext
): ValidationResult {
  const hasRequired = validationRules?.some((r) => r.type === 'required');

  // Null/undefined/empty always valid (optional fields) — unless required rule exists
  if (value === null || value === undefined || value === '') {
    if (hasRequired) {
      const reqRule = validationRules!.find((r) => r.type === 'required');
      return { valid: false, error: reqRule?.message || 'This field is required' };
    }
    return { valid: true };
  }

  // Basic type validation
  switch (cellType) {
    case 'number': {
      const num = Number(value);
      if (isNaN(num)) return { valid: false, error: 'Must be a number' };
      break;
    }
    case 'date': {
      const str = String(value);
      if (isNaN(Date.parse(str))) return { valid: false, error: 'Invalid date format' };
      break;
    }
    case 'checkbox': {
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false' && value !== 0 && value !== 1) {
        return { valid: false, error: 'Must be true or false' };
      }
      break;
    }
    case 'dropdown': {
      let effectiveOptions = options;
      if (dependentContext) {
        const parentValue = dependentContext.rowData?.[dependentContext.parentColumnName];
        if (parentValue && typeof parentValue === 'string' && dependentContext.dependentOn.mapping[parentValue]) {
          effectiveOptions = dependentContext.dependentOn.mapping[parentValue];
        }
      }
      if (effectiveOptions && effectiveOptions.length > 0 && !effectiveOptions.includes(String(value))) {
        return { valid: false, error: `Must be one of: ${effectiveOptions.join(', ')}` };
      }
      break;
    }
    case 'file': {
      const str = String(value);
      try {
        const parsed = JSON.parse(str);
        if (!parsed.filename || !parsed.originalName) {
          return { valid: false, error: 'Invalid file metadata' };
        }
      } catch {
        return { valid: false, error: 'Invalid file metadata' };
      }
      break;
    }
    case 'text':
    case 'markdown':
    case 'formula':
    default:
      break;
  }

  // Custom validation rules
  if (validationRules) {
    for (const rule of validationRules) {
      if (rule.type === 'required') continue; // Already handled above

      switch (rule.type) {
        case 'min_value': {
          const num = Number(value);
          const min = Number(rule.value);
          if (!isNaN(num) && !isNaN(min) && num < min) {
            return { valid: false, error: rule.message || `Must be at least ${min}` };
          }
          break;
        }
        case 'max_value': {
          const num = Number(value);
          const max = Number(rule.value);
          if (!isNaN(num) && !isNaN(max) && num > max) {
            return { valid: false, error: rule.message || `Must be at most ${max}` };
          }
          break;
        }
        case 'min_length': {
          const len = String(value).length;
          const min = Number(rule.value);
          if (!isNaN(min) && len < min) {
            return { valid: false, error: rule.message || `Must be at least ${min} characters` };
          }
          break;
        }
        case 'max_length': {
          const len = String(value).length;
          const max = Number(rule.value);
          if (!isNaN(max) && len > max) {
            return { valid: false, error: rule.message || `Must be at most ${max} characters` };
          }
          break;
        }
        case 'regex': {
          if (rule.value) {
            try {
              const regex = new RegExp(String(rule.value));
              if (!regex.test(String(value))) {
                return { valid: false, error: rule.message || `Does not match pattern` };
              }
            } catch {
              // Invalid regex, skip
            }
          }
          break;
        }
        case 'custom_list': {
          if (rule.value) {
            const allowed = String(rule.value).split(',').map((s) => s.trim());
            if (!allowed.includes(String(value))) {
              return { valid: false, error: rule.message || `Must be one of: ${allowed.join(', ')}` };
            }
          }
          break;
        }
      }
    }
  }

  return { valid: true };
}
