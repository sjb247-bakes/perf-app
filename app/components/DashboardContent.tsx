'use client';

import MindsetAdvisor from '@/app/components/MindsetAdvisor';
import ProfileSettings from '@/app/components/ProfileSettings';
import ActivityFeed from '@/app/components/ActivityFeed';
import IntegrationSync from '@/app/components/IntegrationSync';
import Link from 'next/link';
import { Link2, LogOut, User } from 'lucide-react';

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

            {/* Activity Feed */}
            <ActivityFeed />
          </div>

          {/* Sidebar (Right - 1 col) */}
          <div className="space-y-6">
            {/* Integration Sync */}
            <IntegrationSync />

            {/* Profile Settings */}
            <ProfileSettings />

            {/* Quick Stats */}
            <QuickStats />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Quick stats widget showing today's key metrics at a glance
 */
function QuickStats() {
  return (
    <div className="bg-zinc-900 rounded-lg shadow-md p-6 border border-zinc-800">
      <h3 className="font-bold text-lg mb-4 text-white">Quick Metrics</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Sleep Score</span>
          <span className="font-bold text-white">—</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">HRV Status</span>
          <span className="font-bold text-white">—</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Body Battery</span>
          <span className="font-bold text-white">—</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Stress Level</span>
          <span className="font-bold text-white">—</span>
        </div>
      </div>
      <p className="text-xs text-zinc-500 mt-4">Complete your daily check-in to see live metrics</p>
    </div>
  );
}
