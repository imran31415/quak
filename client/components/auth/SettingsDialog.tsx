import { useEffect, useState } from 'react';
import { useUserStore } from '../../store/userStore';

interface Device {
  token: string;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
}

interface SettingsDialogProps {
  onClose: () => void;
}

export function SettingsDialog({ onClose }: SettingsDialogProps) {
  const user = useUserStore((s) => s.user);
  const saveSettings = useUserStore((s) => s.saveSettings);
  const fetchMe = useUserStore((s) => s.fetchMe);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [pairExpiresAt, setPairExpiresAt] = useState<number | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [pairCountdown, setPairCountdown] = useState(0);

  useEffect(() => { setDisplayName(user?.displayName ?? ''); }, [user?.displayName]);

  useEffect(() => {
    fetch('/api/me/devices', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setDevices(d.devices ?? []))
      .catch(() => setDevices([]));
  }, []);

  // Countdown for active pair code.
  useEffect(() => {
    if (!pairExpiresAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.round((pairExpiresAt - Date.now()) / 1000));
      setPairCountdown(remaining);
      if (remaining === 0) setPairCode(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pairExpiresAt]);

  const handleSave = async () => {
    setSavingSettings(true);
    setError(null);
    try {
      const payload: Parameters<typeof saveSettings>[0] = {};
      if (displayName !== (user?.displayName ?? '')) payload.displayName = displayName;
      if (apiKeyDraft) payload.openrouterApiKey = apiKeyDraft;
      await saveSettings(payload);
      setApiKeyDraft('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleClearKey = async () => {
    setSavingSettings(true);
    setError(null);
    try {
      await saveSettings({ openrouterApiKey: null });
      setApiKeyDraft('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleGeneratePairCode = async () => {
    setError(null);
    try {
      const r = await fetch('/api/auth/pair-code', { method: 'POST', credentials: 'include' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setPairCode(data.code);
      setPairExpiresAt(Date.now() + (data.expiresInSeconds ?? 300) * 1000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRedeemCode = async () => {
    setRedeemError(null);
    try {
      const r = await fetch('/api/auth/pair', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: redeemCode.trim() }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${r.status}`);
      }
      // Reload to pick up the merged user's data.
      window.location.reload();
    } catch (err) {
      setRedeemError((err as Error).message);
    }
  };

  const handleRevoke = async (token: string) => {
    await fetch(`/api/me/devices/${encodeURIComponent(token)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    setDevices((d) => d.filter((x) => x.token !== token));
    fetchMe();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="settings-dialog"
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Settings</h2>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl">&times;</button>
        </div>

        <div className="p-4 space-y-5">
          {/* Display name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              data-testid="settings-display-name"
            />
          </div>

          {/* OpenRouter API key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">OpenRouter API key</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {user?.hasApiKey
                ? 'A key is saved on the server. Type a new one to replace it, or clear it to use the default model.'
                : 'Optional. Add a key to use Claude / GPT / Gemini via OpenRouter.'}
            </p>
            <input
              type="password"
              value={apiKeyDraft}
              onChange={(e) => setApiKeyDraft(e.target.value)}
              placeholder={user?.hasApiKey ? '••••••••' : 'sk-or-...'}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              data-testid="settings-api-key"
            />
            {user?.hasApiKey && (
              <button onClick={handleClearKey} className="text-xs text-red-600 dark:text-red-400 hover:underline mt-1">
                Clear saved key
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={savingSettings}
              className="px-4 py-2 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
              data-testid="settings-save"
            >
              {savingSettings ? 'Saving...' : 'Save'}
            </button>
            {error && <span className="text-sm text-red-600 dark:text-red-400 self-center">{error}</span>}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 -mx-4" />

          {/* Pair another device */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Pair another device</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Generate a 6-digit code, then enter it on your other device's Settings page to link both to the same account.
              <br />
              <span className="text-amber-600 dark:text-amber-400">No email or password — pair before you lose access to all your devices.</span>
            </p>
            {pairCode ? (
              <div className="text-center bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded p-4" data-testid="settings-pair-code">
                <div className="text-3xl font-mono font-bold tracking-[0.3em] text-gray-900 dark:text-gray-100">{pairCode}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Expires in {pairCountdown}s</p>
              </div>
            ) : (
              <button
                onClick={handleGeneratePairCode}
                className="px-3 py-1.5 text-sm bg-purple-600 dark:bg-purple-500 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-600"
                data-testid="settings-generate-pair-code"
              >
                Generate pairing code
              </button>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Have a code from another device?</h3>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono tracking-widest"
                data-testid="settings-redeem-input"
              />
              <button
                onClick={handleRedeemCode}
                disabled={redeemCode.length !== 6}
                className="px-3 py-1.5 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
                data-testid="settings-redeem-submit"
              >
                Pair
              </button>
            </div>
            {redeemError && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{redeemError}</p>}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 -mx-4" />

          {/* Linked devices */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Linked devices ({devices.length})</h3>
            <div className="space-y-1">
              {devices.map((d) => (
                <div key={d.token} className="flex items-center justify-between py-1 text-sm">
                  <div className="truncate flex-1">
                    <div className="text-gray-800 dark:text-gray-100 truncate">
                      {d.userAgent ? d.userAgent.slice(0, 60) : 'Unknown device'}
                      {d.isCurrent && <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(this device)</span>}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Last seen: {new Date(d.lastSeenAt).toLocaleString()}</div>
                  </div>
                  {!d.isCurrent && (
                    <button
                      onClick={() => handleRevoke(d.token)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline ml-2"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
              {devices.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-500">No devices yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
