'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';

interface CheckInData {
  physical_energy: number;
  mental_focus: number;
  stress_level: number;
  notes?: string;
}

export default function DailyCheckIn() {
  const { user } = useUser();
  const [checkIn, setCheckIn] = useState<CheckInData>({
    physical_energy: 5,
    mental_focus: 5,
    stress_level: 5,
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasToday, setHasToday] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const fetchTodayCheckIn = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('subjective_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (data) {
        setCheckIn({
          physical_energy: data.physical_energy || 5,
          mental_focus: data.mental_focus || 5,
          stress_level: data.stress_level || 5,
          notes: data.notes || '',
        });
        setHasToday(true);
      }
    };

    fetchTodayCheckIn();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      const { error } = await supabase
        .from('subjective_logs')
        .upsert({
          user_id: user.id,
          date: today,
          physical_energy: checkIn.physical_energy,
          mental_focus: checkIn.mental_focus,
          stress_level: checkIn.stress_level,
          notes: checkIn.notes,
        });

      if (error) throw error;

      setSubmitted(true);
      setHasToday(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      console.error('Error saving check-in:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 rounded-lg shadow-md p-6 mb-6 border border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Daily Check-in</h2>
        {hasToday && <span className="text-sm text-green-400">✓ Updated today</span>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Physical Energy */}
        <div>
          <label className="block text-sm font-medium mb-2 text-white">
            Physical Energy: <span className="font-bold text-lg text-blue-400">{checkIn.physical_energy}/10</span>
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={checkIn.physical_energy}
            onChange={(e) =>
              setCheckIn({ ...checkIn, physical_energy: parseInt(e.target.value) })
            }
            className="w-full h-2 bg-blue-900 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>Exhausted</span>
            <span>Peak</span>
          </div>
        </div>

        {/* Mental Focus */}
        <div>
          <label className="block text-sm font-medium mb-2 text-white">
            Mental Focus: <span className="font-bold text-lg text-purple-400">{checkIn.mental_focus}/10</span>
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={checkIn.mental_focus}
            onChange={(e) =>
              setCheckIn({ ...checkIn, mental_focus: parseInt(e.target.value) })
            }
            className="w-full h-2 bg-purple-900 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>Brain fog</span>
            <span>Sharp</span>
          </div>
        </div>

        {/* Stress Level */}
        <div>
          <label className="block text-sm font-medium mb-2 text-white">
            Stress Level: <span className="font-bold text-lg text-red-400">{checkIn.stress_level}/10</span>
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={checkIn.stress_level}
            onChange={(e) =>
              setCheckIn({ ...checkIn, stress_level: parseInt(e.target.value) })
            }
            className="w-full h-2 bg-red-900 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>Calm</span>
            <span>Overwhelmed</span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-2 text-white">Notes (optional)</label>
          <textarea
            value={checkIn.notes || ''}
            onChange={(e) => setCheckIn({ ...checkIn, notes: e.target.value })}
            placeholder="Any additional context? e.g., 'Slept 6 hours', 'Heavy work day'..."
            className="w-full p-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:bg-zinc-700"
        >
          {loading ? 'Saving...' : 'Save Check-in'}
        </button>

        {submitted && (
          <div className="text-green-400 text-sm font-medium">
            ✓ Check-in saved successfully!
          </div>
        )}
      </form>
    </div>
  );
}
