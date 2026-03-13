'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';

export default function ActivityFeed() {
  const { user } = useUser();
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCount, setExpandedCount] = useState(5);

  useEffect(() => {
    if (!user) return;

    const fetchDailyData = async () => {
      try {
        // Fetch recent daily data from Garmin
        const { data: garminData, error } = await supabase
          .from('garmin_daily')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(30);

        if (error) {
          console.error('Error fetching daily data:', error.message);
        }

        if (garminData) {
          setDailyData(garminData);
        }
      } catch (error) {
        console.error('Error fetching daily data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDailyData();
  }, [user]);

  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-lg shadow-md p-6 border border-zinc-800">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-zinc-700 rounded w-1/3"></div>
          <div className="h-4 bg-zinc-700 rounded w-full"></div>
          <div className="h-4 bg-zinc-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (dailyData.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-lg shadow-md p-6 border border-zinc-800">
        <h3 className="font-bold text-lg mb-4 text-white">Daily Wellness Log</h3>
        <p className="text-sm text-zinc-400">No data synced yet. Check your Garmin connection.</p>
      </div>
    );
  }

  const visibleData = dailyData.slice(0, expandedCount);
  const hasMore = dailyData.length > expandedCount;

  return (
    <div className="bg-zinc-900 rounded-lg shadow-md p-6 border border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-white">Daily Wellness Log</h3>
        <span className="text-xs text-zinc-500">Last {visibleData.length} days</span>
      </div>
      <div className="space-y-3">
        {visibleData.map((day) => (
          <div key={day.id} className="border-b border-zinc-700 pb-3 last:border-b-0">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-sm text-white">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                <div className="text-xs text-zinc-500 mt-1 space-y-1">
                  {day.sleep_score && <p>Sleep: {day.sleep_score}/100</p>}
                  {day.hrv_rmssd && <p>HRV: {Math.round(day.hrv_rmssd)}ms</p>}
                  {day.body_battery_high && <p>Battery: {day.body_battery_high}%</p>}
                  {day.avg_stress && <p>Stress: {day.avg_stress}</p>}
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-blue-400">
                  {day.sleep_score ? `${day.sleep_score}` : '—'}
                </span>
                <p className="text-xs text-zinc-600 mt-1">sleep</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Toggle Button */}
      {hasMore && (
        <button
          onClick={() => setExpandedCount(expandedCount === 5 ? dailyData.length : 5)}
          className="mt-4 w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded text-sm font-medium transition-colors"
        >
          {expandedCount === 5 ? `📊 Show More (${dailyData.length - 5} more)` : '📊 Show Less'}
        </button>
      )}
    </div>
  );
}
