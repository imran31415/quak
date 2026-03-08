import { useState } from 'react';
import { FORMAT_COLORS } from '@shared/constants';
import type { ConditionalFormatRule, ConditionalOperator } from '@shared/types';

const OPERATORS: { value: ConditionalOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
  { value: 'contains', label: 'Contains' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' },
];

interface ConditionalFormatPanelProps {
  rules: ConditionalFormatRule[];
  onSave: (rules: ConditionalFormatRule[]) => void;
  onClose: () => void;
}

export function ConditionalFormatPanel({ rules: initialRules, onSave, onClose }: ConditionalFormatPanelProps) {
  const [rules, setRules] = useState<ConditionalFormatRule[]>(initialRules);

  const addRule = () => {
    setRules([
      ...rules,
      {
        id: `rule_${Date.now()}`,
        operator: 'equals',
        value: '',
        bgColor: FORMAT_COLORS[0].bg,
        textColor: FORMAT_COLORS[0].text,
      },
    ]);
  };

  const updateRule = (index: number, updates: Partial<ConditionalFormatRule>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    setRules(newRules);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const needsValue = (op: ConditionalOperator) => op !== 'is_empty' && op !== 'is_not_empty';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="conditional-format-overlay"
    >
    <div
      className="w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 p-3"
      data-testid="conditional-format-panel"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Conditional Formatting</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm">
          &times;
        </button>
      </div>

      <div className="space-y-3 max-h-60 overflow-y-auto">
        {rules.map((rule, i) => (
          <div key={rule.id} className="border border-gray-200 dark:border-gray-600 rounded p-2 space-y-2" data-testid={`format-rule-${i}`}>
            <div className="flex gap-2">
              <select
                value={rule.operator}
                onChange={(e) => updateRule(i, { operator: e.target.value as ConditionalOperator })}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                data-testid={`format-operator-${i}`}
              >
                {OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
              <button
                onClick={() => removeRule(i)}
                className="text-red-500 hover:text-red-700 text-xs px-1"
                data-testid={`format-remove-${i}`}
              >
                &times;
              </button>
            </div>

            {needsValue(rule.operator) && (
              <input
                type="text"
                value={rule.value || ''}
                onChange={(e) => updateRule(i, { value: e.target.value })}
                placeholder="Value"
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                data-testid={`format-value-${i}`}
              />
            )}

            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Color:</span>
              <div className="flex gap-1 mt-1">
                {FORMAT_COLORS.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => updateRule(i, { bgColor: color.bg, textColor: color.text })}
                    className={`w-5 h-5 rounded border-2 ${rule.bgColor === color.bg ? 'border-blue-500' : 'border-transparent'}`}
                    style={{ backgroundColor: color.bg }}
                    title={color.name}
                    data-testid={`format-color-${color.name.toLowerCase()}-${i}`}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addRule}
        className="w-full mt-2 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
        data-testid="add-format-rule"
      >
        + Add Rule
      </button>

      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onSave(rules)}
          className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          data-testid="save-format-rules"
        >
          Save
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-200"
          data-testid="cancel-format-rules"
        >
          Cancel
        </button>
      </div>
    </div>
    </div>
  );
}
