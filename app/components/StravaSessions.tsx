'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';

type StravaActivity = {
  id: number;
  name: string;
  type: string;
  distance: number | null;
  moving_time: number | null;
  start_date: string;
  average_heartrate: number | null;
};

type GarminDaily = {
  date: string;
  steps: number | null;
  sleep_score: number | null;
  avg_stress: number | null;
};

type SessionRow = {
  id: string;
  source: 'strava' | 'garmin';
  title: string;
  subtitle: string;
  stat1: string;
  stat2: string;
  stat3: string;
  sortDate: string;
};

function formatDistanceMeters(distance: number | null) {
  if (!distance) return '—';
  return `${(distance / 1000).toFixed(1)} km`;
}

function formatMovingTime(seconds: number | null) {
  if (!seconds) return '—';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

export default function StravaSessions() {
  const { user } = useUser();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchSessions = async () => {
      try {
        const { data: stravaData, error: stravaError } = await supabase
          .from('strava_activities')
          .select('id,name,type,distance,moving_time,start_date,average_heartrate')
          .eq('user_id', user.id)
          .order('start_date', { ascending: false })
          .limit(6);

        const { data: garminData, error: garminError } = await supabase
          .from('garmin_daily')
          .select('date,steps,sleep_score,avg_stress')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(6);

        if (stravaError) {
          console.error('Failed to fetch Strava sessions:', stravaError.message);
        }
        if (garminError) {
          console.error('Failed to fetch Garmin sessions:', garminError.message);
        }

        const stravaRows = ((stravaData ?? []) as StravaActivity[]).map((activity) => ({
          id: `strava-${activity.id}`,
          source: 'strava' as const,
          title: activity.name || activity.type,
          subtitle: `${new Date(activity.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${activity.type}`,
          stat1: formatDistanceMeters(activity.distance),
          stat2: formatMovingTime(activity.moving_time),
          stat3: activity.average_heartrate ? `${Math.round(activity.average_heartrate)} bpm` : '—',
          sortDate: activity.start_date,
        }));

        const garminRows = ((garminData ?? []) as GarminDaily[]).map((day) => ({
          id: `garmin-${day.date}`,
          source: 'garmin' as const,
          title: 'Garmin Daily Summary',
          subtitle: `${new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          stat1: day.steps != null ? `${day.steps.toLocaleString()} steps` : '—',
          stat2: day.sleep_score != null ? `Sleep ${day.sleep_score}/100` : '—',
          stat3: day.avg_stress != null ? `Stress ${day.avg_stress}` : '—',
          sortDate: day.date,
        }));

        const combined = [...stravaRows, ...garminRows]
          .sort((a, b) => (a.sortDate < b.sortDate ? 1 : -1))
          .slice(0, 8);

        if (combined.length === 0) {
          return;
        }

        setSessions(combined);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [user]);

  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-lg shadow-md p-6 border border-zinc-800">
        <h3 className="font-bold text-lg text-white mb-4">Recent Strava Sessions</h3>
        <p className="text-sm text-zinc-400">Loading sessions...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-lg shadow-md p-6 border border-zinc-800">
        <h3 className="font-bold text-lg text-white mb-4">Recent Sessions</h3>
        <p className="text-sm text-zinc-400">No sessions yet. Connect Garmin/Strava and run sync.</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-lg shadow-md p-6 border border-zinc-800">
      <h3 className="font-bold text-lg text-white mb-4">Recent Sessions</h3>
      <div className="space-y-3">
        {sessions.map((activity) => (
          <div key={activity.id} className="border-b border-zinc-800 pb-3 last:border-b-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <Image
                  src={activity.source === 'strava' ? '/strava-logo.svg' : '/garmin-logo.svg'}
                  alt={activity.source === 'strava' ? 'Strava' : 'Garmin'}
                  width={18}
                  height={18}
                  className="rounded-sm mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-white">{activity.title}</p>
                  <p className="text-xs text-zinc-500">{activity.subtitle}</p>
                </div>
              </div>
              <div className="text-right text-xs text-zinc-400">
                <p>{activity.stat1}</p>
                <p>{activity.stat2}</p>
                <p>{activity.stat3}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
