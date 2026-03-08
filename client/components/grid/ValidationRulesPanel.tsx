import { useState } from 'react';
import type { ValidationRule, ValidationRuleType } from '@shared/types';

const RULE_TYPES: { value: ValidationRuleType; label: string; needsValue: boolean }[] = [
  { value: 'required', label: 'Required', needsValue: false },
  { value: 'min_value', label: 'Min Value', needsValue: true },
  { value: 'max_value', label: 'Max Value', needsValue: true },
  { value: 'min_length', label: 'Min Length', needsValue: true },
  { value: 'max_length', label: 'Max Length', needsValue: true },
  { value: 'regex', label: 'Regex Pattern', needsValue: true },
  { value: 'custom_list', label: 'Custom List', needsValue: true },
];

interface ValidationRulesPanelProps {
  rules: ValidationRule[];
  onSave: (rules: ValidationRule[]) => void;
  onClose: () => void;
}

export function ValidationRulesPanel({ rules: initialRules, onSave, onClose }: ValidationRulesPanelProps) {
  const [rules, setRules] = useState<ValidationRule[]>(initialRules);

  const hasRequired = rules.some((r) => r.type === 'required');

  const toggleRequired = () => {
    if (hasRequired) {
      setRules(rules.filter((r) => r.type !== 'required'));
    } else {
      setRules([{ type: 'required' }, ...rules]);
    }
  };

  const addRule = () => {
    setRules([...rules, { type: 'min_value', value: '' }]);
  };

  const updateRule = (index: number, updates: Partial<ValidationRule>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    setRules(newRules);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="validation-rules-overlay"
    >
    <div
      className="w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 p-3"
      data-testid="validation-rules-panel"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Validation Rules</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm">
          &times;
        </button>
      </div>

      {/* Required toggle */}
      <label className="flex items-center gap-2 mb-2 cursor-pointer" data-testid="required-toggle">
        <input
          type="checkbox"
          checked={hasRequired}
          onChange={toggleRequired}
          className="rounded border-gray-300"
        />
        <span className="text-sm text-gray-700 dark:text-gray-200">Required</span>
      </label>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {rules.filter((r) => r.type !== 'required').map((rule, rawI) => {
          const i = rules.indexOf(rule);
          const ruleType = RULE_TYPES.find((t) => t.value === rule.type);
          return (
            <div key={i} className="border border-gray-200 dark:border-gray-600 rounded p-2 space-y-1" data-testid={`validation-rule-${rawI}`}>
              <div className="flex gap-2">
                <select
                  value={rule.type}
                  onChange={(e) => updateRule(i, { type: e.target.value as ValidationRuleType })}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  data-testid={`validation-type-${rawI}`}
                >
                  {RULE_TYPES.filter((t) => t.value !== 'required').map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeRule(i)}
                  className="text-red-500 hover:text-red-700 text-xs px-1"
                  data-testid={`validation-remove-${rawI}`}
                >
                  &times;
                </button>
              </div>
              {ruleType?.needsValue && (
                <input
                  type="text"
                  value={rule.value !== undefined ? String(rule.value) : ''}
                  onChange={(e) => updateRule(i, { value: e.target.value })}
                  placeholder="Value"
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  data-testid={`validation-value-${rawI}`}
                />
              )}
              <input
                type="text"
                value={rule.message || ''}
                onChange={(e) => updateRule(i, { message: e.target.value || undefined })}
                placeholder="Custom error message (optional)"
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                data-testid={`validation-message-${rawI}`}
              />
            </div>
          );
        })}
      </div>

      <button
        onClick={addRule}
        className="w-full mt-2 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
        data-testid="add-validation-rule"
      >
        + Add Rule
      </button>

      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onSave(rules)}
          className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          data-testid="save-validation-rules"
        >
          Save
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-200"
          data-testid="cancel-validation-rules"
        >
          Cancel
        </button>
      </div>
    </div>
    </div>
  );
}
