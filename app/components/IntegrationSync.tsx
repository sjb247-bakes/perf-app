'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type IntegrationSyncProps = {
  compact?: boolean;
};

export default function IntegrationSync({ compact = false }: IntegrationSyncProps) {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = createClient();

  const triggerSync = async (token: string) => {
    return fetch('/api/integrations/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setMessage('❌ You are not logged in.');
        return;
      }

      let { data: { session } } = await supabase.auth.getSession();
      let bearer = session?.access_token ?? '';

      // Refresh stale client auth before sync (common on long-lived mobile tabs).
      if (!bearer) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        bearer = refreshed.session?.access_token ?? '';
      }

      if (!bearer) {
        setMessage('❌ Missing active auth session. Please refresh and retry.');
        return;
      }

      // Trigger server-side sync orchestrator; retry once after token refresh if needed.
      let response = await triggerSync(bearer);
      let result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errText = String(result?.error || '').toLowerCase();
        const shouldRetryAuth = response.status === 401 || errText.includes('invalid jwt');
        if (shouldRetryAuth) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          const retryBearer = refreshed.session?.access_token ?? '';
          if (retryBearer) {
            response = await triggerSync(retryBearer);
            result = await response.json().catch(() => ({}));
          }
        }
      }


      if (response.ok) {
        setMessage(`✓ ${result?.message || 'Sync completed.'}`);
        setTimeout(() => setMessage(''), 3000);
      } else {
        const reason = result?.error || result?.message || `Sync failed (HTTP ${response.status})`;
        setMessage(`❌ ${reason}`);
      }
    } catch (error) {
      setMessage('❌ Error during sync. Check console.');
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  if (compact) {
    return (
      <div className="flex flex-col items-end">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-zinc-700"
          aria-label="Sync data now"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync'}
        </button>
        {message && (
          <p className={`mt-2 max-w-56 text-right text-xs ${message.includes('✓') ? 'text-green-400' : 'text-red-400'}`}>
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-lg shadow-md p-6 border border-zinc-800">
      <h3 className="font-bold text-lg mb-4 text-white">Data Sync</h3>
      <button
        onClick={handleSync}
        disabled={syncing}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white py-2 rounded-md font-medium transition-colors"
      >
        <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Syncing...' : 'Sync Now'}
      </button>

      {message && (
        <p className={`text-sm mt-3 ${message.includes('✓') ? 'text-green-400' : 'text-red-400'}`}>
          {message}
        </p>
      )}

      <p className="text-xs text-zinc-500 mt-4">
        Syncs latest Garmin & Strava data to your dashboard.
      </p>
    </div>
  );
}
