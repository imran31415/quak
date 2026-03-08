import type { ConditionalFormatRule } from '@shared/types';

export function evaluateRules(
  value: unknown,
  rules: ConditionalFormatRule[],
  theme: 'light' | 'dark'
): Record<string, string> | null {
  const strValue = value === null || value === undefined ? '' : String(value);
  const numValue = Number(value);

  for (const rule of rules) {
    let matches = false;

    switch (rule.operator) {
      case 'equals':
        matches = strValue === (rule.value ?? '');
        break;
      case 'not_equals':
        matches = strValue !== (rule.value ?? '');
        break;
      case 'greater_than':
        matches = !isNaN(numValue) && numValue > Number(rule.value ?? 0);
        break;
      case 'less_than':
        matches = !isNaN(numValue) && numValue < Number(rule.value ?? 0);
        break;
      case 'contains':
        matches = strValue.toLowerCase().includes((rule.value ?? '').toLowerCase());
        break;
      case 'is_empty':
        matches = strValue === '' || value === null || value === undefined;
        break;
      case 'is_not_empty':
        matches = strValue !== '' && value !== null && value !== undefined;
        break;
    }

    if (matches) {
      return {
        backgroundColor: theme === 'dark' ? rule.bgColor : rule.bgColor,
        color: theme === 'dark' ? rule.textColor : rule.textColor,
      };
    }
  }

  return null;
}
