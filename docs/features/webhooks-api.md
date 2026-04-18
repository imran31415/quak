# Webhooks & REST API Keys

Quak provides authenticated REST API access and webhook notifications for integrating with external services like Zapier, n8n, or custom scripts.

## API Keys

### Creating Keys

Open **Settings** (gear icon in the header) and go to the **API Keys** tab. Enter a name and click **Create**. The full key is shown once — copy it immediately.

Keys are prefixed with `qk_` and hashed with SHA-256 before storage. The plaintext key is never stored.

### Using Keys

Include the key in your HTTP requests:

```bash
# Using x-api-key header
curl -H "x-api-key: qk_abc123..." http://localhost:3001/api/sheets

# Using Authorization header
curl -H "Authorization: Bearer qk_abc123..." http://localhost:3001/api/sheets
```

### Backwards Compatibility

If no API key is provided, requests pass through without authentication. This means the UI continues to work without keys, and keys are only enforced when provided.

### Revoking Keys

Click the trash icon next to any key in the Settings panel to permanently revoke it. Revoked keys are immediately rejected.

## Webhooks

### Creating Webhooks

Open **Settings** → **Webhooks** tab → **Add Webhook**. Configure:

| Field | Description |
|-------|-------------|
| Name | A label for this webhook |
| URL | The endpoint to POST to |
| Sheet | Which sheet triggers this webhook |
| Events | Which events to listen for |
| Secret | Optional HMAC signing secret |

### Supported Events

| Event | Trigger |
|-------|---------|
| `row_added` | A new row is added to the sheet |
| `row_deleted` | One or more rows are deleted |
| `cell_updated` | A cell value is changed (single or bulk) |
| `sheet_updated` | Sheet metadata is updated (name, columns) |

### Payload Format

```json
{
  "event": "row_added",
  "timestamp": "2026-03-30T12:00:00.000Z",
  "sheetId": "abc-123",
  "data": {
    "rowId": 42
  }
}
```

### HMAC Signature

If a secret is configured, Quak includes an `X-Quak-Signature` header with an HMAC-SHA256 hex digest of the request body:

```
X-Quak-Signature: a1b2c3d4e5f6...
```

Verify it in your endpoint:

```javascript
const crypto = require('crypto');
const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
if (signature !== expected) throw new Error('Invalid signature');
```

### Testing Webhooks

Click the play button next to any webhook to send a test payload. The test event includes `"event": "test"` and a test message.

### Active/Inactive Toggle

Each webhook has an active toggle. Inactive webhooks are stored but won't fire on events.

## REST API Endpoints

### Sheets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sheets` | List all sheets |
| POST | `/api/sheets` | Create a sheet |
| GET | `/api/sheets/:id` | Get sheet with rows |
| PUT | `/api/sheets/:id` | Update sheet metadata |
| DELETE | `/api/sheets/:id` | Delete a sheet |

### Rows & Cells

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sheets/:id/rows` | Add a row |
| DELETE | `/api/sheets/:id/rows` | Delete rows |
| PUT | `/api/sheets/:id/cells` | Update a cell |
| PUT | `/api/sheets/:id/cells/bulk` | Bulk update cells |

### API Keys

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/api-keys` | List all keys |
| POST | `/api/api-keys` | Create a key |
| DELETE | `/api/api-keys/:id` | Revoke a key |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/webhooks` | List all webhooks |
| POST | `/api/webhooks` | Create a webhook |
| PUT | `/api/webhooks/:id` | Update a webhook |
| DELETE | `/api/webhooks/:id` | Delete a webhook |
| POST | `/api/webhooks/:id/test` | Send test payload |
