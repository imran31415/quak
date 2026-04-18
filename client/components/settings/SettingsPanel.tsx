import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/sheets';
import { useUIStore } from '../../store/uiStore';
import { useToastStore } from '../../store/toastStore';
import type { ApiKey, Webhook } from '@shared/types';

type Tab = 'api-keys' | 'webhooks';

const WEBHOOK_EVENTS = ['row_added', 'row_deleted', 'cell_updated', 'sheet_updated'] as const;

export function SettingsPanel() {
  const toggleSettingsPanel = useUIStore((s) => s.toggleSettingsPanel);
  const [tab, setTab] = useState<Tab>('api-keys');

  return (
    <div
      className="absolute right-0 top-0 bottom-0 w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl z-40 flex flex-col"
      data-testid="settings-panel"
    >
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Settings</h2>
        <button
          onClick={toggleSettingsPanel}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          aria-label="Close settings"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setTab('api-keys')}
          className={`flex-1 py-2 text-xs font-medium ${tab === 'api-keys' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          API Keys
        </button>
        <button
          onClick={() => setTab('webhooks')}
          className={`flex-1 py-2 text-xs font-medium ${tab === 'webhooks' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          Webhooks
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === 'api-keys' ? <ApiKeysTab /> : <WebhooksTab />}
      </div>
    </div>
  );
}

function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore((s) => s.addToast);

  const fetchKeys = useCallback(async () => {
    try {
      const data = await api.listApiKeys();
      setKeys(data);
    } catch {
      addToast('Failed to load API keys', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    try {
      const result = await api.createApiKey(newKeyName.trim());
      setRevealedKey(result.key);
      setNewKeyName('');
      fetchKeys();
      addToast('API key created', 'success');
    } catch {
      addToast('Failed to create API key', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteApiKey(id);
      fetchKeys();
      addToast('API key revoked', 'success');
    } catch {
      addToast('Failed to revoke API key', 'error');
    }
  };

  const handleCopyKey = () => {
    if (revealedKey) {
      navigator.clipboard.writeText(revealedKey);
      addToast('Key copied to clipboard', 'success');
    }
  };

  return (
    <div className="p-3 space-y-3">
      {revealedKey && (
        <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded text-xs">
          <p className="font-medium text-green-800 dark:text-green-200 mb-1">New API Key (shown once):</p>
          <code className="block bg-white dark:bg-gray-900 p-2 rounded font-mono text-[10px] break-all border">
            {revealedKey}
          </code>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleCopyKey}
              className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
            >
              Copy
            </button>
            <button
              onClick={() => setRevealedKey(null)}
              className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="Key name (e.g. My Integration)"
          className="flex-1 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          data-testid="api-key-name-input"
        />
        <button
          onClick={handleCreate}
          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          data-testid="create-api-key"
        >
          Create
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-gray-400">Loading...</p>
      ) : keys.length === 0 ? (
        <p className="text-xs text-gray-400">No API keys yet. Create one to enable external access.</p>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div key={key.id} className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-100">{key.name}</p>
                  <p className="text-[10px] text-gray-500 font-mono">{key.keyPrefix}...</p>
                </div>
                <button
                  onClick={() => handleDelete(key.id)}
                  className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                  title="Revoke key"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <div className="flex gap-3 mt-1 text-[10px] text-gray-400">
                <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                {key.lastUsedAt && <span>Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <p className="text-[10px] text-gray-400">
          Use API keys to access Quak via REST API. Include the key as <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">x-api-key</code> header or <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">Authorization: Bearer &lt;key&gt;</code>.
        </p>
      </div>
    </div>
  );
}

function WebhooksTab() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formSheetId, setFormSheetId] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formSecret, setFormSecret] = useState('');
  const [sheets, setSheets] = useState<Array<{ id: string; name: string }>>([]);
  const addToast = useToastStore((s) => s.addToast);

  const fetchWebhooks = useCallback(async () => {
    try {
      const data = await api.listWebhooks();
      setWebhooks(data);
    } catch {
      addToast('Failed to load webhooks', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const fetchSheets = useCallback(async () => {
    try {
      const data = await api.listSheets();
      setSheets(data.map((s) => ({ id: s.id, name: s.name })));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchWebhooks(); fetchSheets(); }, [fetchWebhooks, fetchSheets]);

  const handleCreate = async () => {
    if (!formName.trim() || !formUrl.trim() || !formSheetId || formEvents.length === 0) {
      addToast('Fill all required fields', 'error');
      return;
    }
    try {
      await api.createWebhook({
        name: formName.trim(),
        url: formUrl.trim(),
        sheetId: formSheetId,
        events: formEvents,
        secret: formSecret || undefined,
      });
      setShowForm(false);
      setFormName(''); setFormUrl(''); setFormSheetId(''); setFormEvents([]); setFormSecret('');
      fetchWebhooks();
      addToast('Webhook created', 'success');
    } catch {
      addToast('Failed to create webhook', 'error');
    }
  };

  const handleToggleActive = async (webhook: Webhook) => {
    try {
      await api.updateWebhook(webhook.id, { active: !webhook.active } as Partial<Webhook>);
      fetchWebhooks();
    } catch {
      addToast('Failed to update webhook', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteWebhook(id);
      fetchWebhooks();
      addToast('Webhook deleted', 'success');
    } catch {
      addToast('Failed to delete webhook', 'error');
    }
  };

  const handleTest = async (id: string) => {
    try {
      const result = await api.testWebhook(id);
      addToast(`Test sent — ${result.status} ${result.statusText}`, 'success');
    } catch (err) {
      addToast(`Test failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  const toggleEvent = (event: string) => {
    setFormEvents((prev) => prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]);
  };

  return (
    <div className="p-3 space-y-3">
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          data-testid="add-webhook"
        >
          + Add Webhook
        </button>
      )}

      {showForm && (
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600 space-y-2">
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Webhook name"
            className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            data-testid="webhook-name-input"
          />
          <input
            type="url"
            value={formUrl}
            onChange={(e) => setFormUrl(e.target.value)}
            placeholder="https://example.com/webhook"
            className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            data-testid="webhook-url-input"
          />
          <select
            value={formSheetId}
            onChange={(e) => setFormSheetId(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            data-testid="webhook-sheet-select"
          >
            <option value="">Select sheet...</option>
            {sheets.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div>
            <p className="text-[10px] text-gray-500 mb-1">Events:</p>
            <div className="flex flex-wrap gap-1">
              {WEBHOOK_EVENTS.map((event) => (
                <button
                  key={event}
                  onClick={() => toggleEvent(event)}
                  className={`px-2 py-0.5 text-[10px] rounded border ${formEvents.includes(event) ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 text-gray-500'}`}
                >
                  {event}
                </button>
              ))}
            </div>
          </div>
          <input
            type="text"
            value={formSecret}
            onChange={(e) => setFormSecret(e.target.value)}
            placeholder="Secret (optional, for HMAC signing)"
            className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-gray-400">Loading...</p>
      ) : webhooks.length === 0 && !showForm ? (
        <p className="text-xs text-gray-400">No webhooks configured. Add one to receive notifications on data changes.</p>
      ) : (
        <div className="space-y-2">
          {webhooks.map((wh) => (
            <div key={wh.id} className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">{wh.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{wh.url}</p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => handleToggleActive(wh)}
                    className={`w-8 h-4 rounded-full relative transition-colors ${wh.active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    title={wh.active ? 'Active — click to disable' : 'Inactive — click to enable'}
                  >
                    <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${wh.active ? 'left-4' : 'left-0.5'}`} />
                  </button>
                  <button
                    onClick={() => handleTest(wh.id)}
                    className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                    title="Send test"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(wh.id)}
                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                    title="Delete"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {wh.events.map((ev) => (
                  <span key={ev} className="px-1.5 py-0.5 text-[10px] bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">
                    {ev}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
