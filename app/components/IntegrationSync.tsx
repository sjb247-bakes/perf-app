'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function IntegrationSync() {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = createClient();

  const handleSync = async () => {
    setSyncing(true);
    setMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      const bearer = session?.access_token ?? '';
      const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/i)?.[1];
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

      if (!user) {
        setMessage('❌ You are not logged in.');
        return;
      }

      if (!projectRef || !anonKey || !bearer) {
        setMessage('❌ Missing session/config for sync.');
        return;
      }

      // Trigger Edge Function directly with the current user JWT.
      const response = await fetch(`https://${projectRef}.supabase.co/functions/v1/garmin-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify({ userId: user.id, days: 1 }),
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        setMessage(`✓ ${result?.message || 'Sync started! Data will appear shortly.'}`);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`❌ ${result?.error || 'Sync failed. Check your integration settings.'}`);
      }
    } catch (error) {
      setMessage('❌ Error during sync. Check console.');
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

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
