'use client';

import { useState, useEffect } from 'react';
import MindsetAdvisor from '@/app/components/MindsetAdvisor';
import IntegrationSync from '@/app/components/IntegrationSync';
import StravaSessions from '@/app/components/StravaSessions';
import Link from 'next/link';
import { ArrowRight, Link2, LogOut, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function DashboardContent() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Performance Dashboard</h1>
            <p className="text-zinc-400 mt-2">Real-time wellness, training, and mindset insights</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="rounded-md border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 transition-colors hover:text-white"
              aria-label="Profile settings"
            >
              <User className="h-4 w-4" />
            </Link>
            <Link
              href="/integrations"
              className="rounded-md border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 transition-colors hover:text-white"
              aria-label="Integrations"
            >
              <Link2 className="h-4 w-4" />
            </Link>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 transition-colors hover:text-white"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content (Left - 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mindset Advisor */}
            <MindsetAdvisor />

            {/* Strava Sessions */}
            <StravaSessions />

            {/* Wellness Log Preview */}
            <WellnessLogPreview />
          </div>

          {/* Sidebar (Right - 1 col) */}
          <div className="space-y-6">
            {/* Integration Sync */}
            <IntegrationSync />

            {/* Quick Stats */}
            <QuickStats />
          </div>
        </div>
      </div>
    </div>
  );
}

function WellnessLogPreview() {
  return (
    <div className="bg-zinc-900 rounded-lg shadow-md p-6 border border-zinc-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-lg text-white">Wellness Log</h3>
          <p className="text-sm text-zinc-400 mt-1">
            Open the full page for daily log history and profile context controls.
          </p>
        </div>
        <Link
          href="/wellness"
          className="inline-flex items-center gap-2 rounded-md bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white"
        >
          Open
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

    </div>
  );
}

/**
 * Quick stats widget showing today's key metrics at a glance
 */
function QuickStats() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = new Date().toISOString().split('T')[0];

        // Fetch Garmin data
        const { data: garminData } = await supabase
          .from('garmin_daily')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .single();

        // Fetch subjective data
        const { data: subjectiveData } = await supabase
          .from('subjective_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .single();

        setMetrics({
          sleepScore: garminData?.sleep_score ?? null,
          hrv: garminData?.hrv_rmssd ?? garminData?.hrv_last ?? garminData?.hrv_weekly ?? null,
          battery: garminData?.body_battery_high ?? garminData?.bb_wake ?? garminData?.body_battery_low ?? null,
          stress: subjectiveData?.stress_level ?? garminData?.avg_stress ?? null,
        });
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return (
    <div className="bg-zinc-900 rounded-lg shadow-md p-6 border border-zinc-800">
      <h3 className="font-bold text-lg mb-4 text-white">Today's Metrics</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Sleep Score</span>
          <span className="font-bold text-white">{metrics?.sleepScore != null ? `${metrics.sleepScore}/100` : '—'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">HRV (RMSSD)</span>
          <span className="font-bold text-white">{metrics?.hrv != null ? `${Math.round(metrics.hrv)}ms` : '—'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Body Battery</span>
          <span className="font-bold text-white">{metrics?.battery != null ? `${metrics.battery}%` : '—'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Your Stress Level</span>
          <span className="font-bold text-white">{metrics?.stress != null ? `${metrics.stress}/10` : '—'}</span>
        </div>
      </div>
      <p className="text-xs text-zinc-500 mt-4">Updates when Garmin syncs & check-in is saved</p>
    </div>
  );
}
