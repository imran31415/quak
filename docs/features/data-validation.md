# Data Validation

Enforce data quality rules on columns — require values, set min/max bounds, validate with regex patterns, or restrict to a custom list. Invalid cells are highlighted with a red border and show error tooltips.

## Adding Validation Rules

1. Click the **menu icon** on any column header
2. Click **Validation Rules**
3. In the panel that appears:
   - Toggle **Required** to prevent empty values
   - Click **Add Rule** and select a rule type
   - Configure the rule value and optional error message
4. Click **Save** to apply

## Rule Types

| Rule | Description | Applies To |
|------|-------------|------------|
| required | Cell must have a value | All types |
| min_value | Minimum numeric value | Numbers |
| max_value | Maximum numeric value | Numbers |
| min_length | Minimum text length | Text |
| max_length | Maximum text length | Text |
| regex | Must match a regular expression | Text |
| custom_list | Must be one of specified values | Text |

## Visual Feedback

- **Red border** — cells violating rules get a red outline
- **Tooltip** — hover over an invalid cell to see the specific error message
- **Edit rejection** — when you edit a cell, invalid values are rejected with a toast notification

## Examples

### Budget validation
- Required: yes
- Min value: 0 ("Budget must be positive")
- Max value: 100000 ("Budget cannot exceed 100,000")

### Email validation
- Regex: `^[^\s@]+@[^\s@]+\.[^\s@]+$` ("Must be a valid email address")

### Rating validation
- Min value: 1
- Max value: 5
- Required: yes

## Persistence

Validation rules are saved as part of the column configuration on the server. They persist across page reloads.

## Technical Details

- Rules are stored in the `validationRules` array on each `ColumnConfig`
- The `validateValue()` function in `client/utils/validation.ts` checks all rules
- AG Grid's `valueSetter` prevents invalid edits
- `cellClassRules` applies the `.validation-error` CSS class for the red border
- `tooltipValueGetter` shows the error message on hover
