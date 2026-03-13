import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ActivityFeed from '@/app/components/ActivityFeed';
import ProfileSettings from '@/app/components/ProfileSettings';

export default function WellnessPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-md border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 transition-colors hover:text-white"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Wellness Log</h1>
              <p className="text-zinc-400 mt-1">Your daily logs and profile context in one place.</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <ActivityFeed />
          </div>
          <div>
            <ProfileSettings />
          </div>
        </div>
      </div>
    </div>
  );
}
