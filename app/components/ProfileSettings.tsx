'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';

interface ProfileData {
  full_name: string;
  job_type: 'physical' | 'desk' | 'hybrid';
  baseline_activity_level: string;
}

export default function ProfileSettings() {
  const { user } = useUser();
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    job_type: 'desk',
    baseline_activity_level: 'active',
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          job_type: data.job_type || 'desk',
          baseline_activity_level: data.baseline_activity_level || 'active',
        });
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          full_name: profile.full_name,
          job_type: profile.job_type,
          baseline_activity_level: profile.baseline_activity_level,
        });

      if (error) throw error;

      setSaved(true);
      setCollapsed(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 rounded-lg shadow-md p-6 mb-6 border border-zinc-800">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white">Profile & Context</h2>
        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="text-xs rounded-md border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:text-white"
          >
            Edit profile
          </button>
        )}
      </div>

      {collapsed ? (
        <div className="space-y-2 text-sm">
          <p className="text-zinc-300"><span className="text-zinc-500">Name:</span> {profile.full_name || 'Not set'}</p>
          <p className="text-zinc-300"><span className="text-zinc-500">Work type:</span> {profile.job_type}</p>
          <p className="text-zinc-300">
            <span className="text-zinc-500">Baseline activity:</span> {profile.baseline_activity_level}
          </p>
          {saved && <div className="text-green-400 text-sm font-medium">✓ Profile saved successfully!</div>}
        </div>
      ) : (

      <form onSubmit={handleSave} className="space-y-6">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium mb-2 text-white">Full Name</label>
          <input
            type="text"
            value={profile.full_name}
            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
            placeholder="Your name"
            className="w-full p-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Job Type */}
        <div>
          <label className="block text-sm font-medium mb-2 text-white">Job Type</label>
          <p className="text-xs text-zinc-400 mb-3">
            This helps us give advice that's realistic for YOUR life. A tradie can't just "rest" on workdays.
          </p>
          <div className="space-y-3">
            {[
              { value: 'physical', label: 'Physical Work', desc: 'Tradie, construction, manual labor' },
              { value: 'desk', label: 'Desk Work', desc: 'Office, mostly sedentary' },
              { value: 'hybrid', label: 'Hybrid', desc: 'Mix of physical and desk work' },
            ].map((option) => (
              <label key={option.value} className="flex items-start cursor-pointer">
                <input
                  type="radio"
                  name="job_type"
                  value={option.value}
                  checked={profile.job_type === option.value}
                  onChange={(e) =>
                    setProfile({ ...profile, job_type: e.target.value as ProfileData['job_type'] })
                  }
                  className="mt-1 w-4 h-4"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-white">{option.label}</div>
                  <div className="text-xs text-zinc-500">{option.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Baseline Activity Level */}
        <div>
          <label className="block text-sm font-medium mb-2 text-white">Baseline Activity Level</label>
          <p className="text-xs text-zinc-400 mb-3">
            How active are you on a typical week (outside of structured training)?
          </p>
          <select
            value={profile.baseline_activity_level}
            onChange={(e) =>
              setProfile({ ...profile, baseline_activity_level: e.target.value })
            }
            className="w-full p-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="sedentary">Sedentary (mostly sitting)</option>
            <option value="lightly_active">Lightly Active (light exercise 1-3 days/week)</option>
            <option value="active">Active (moderate exercise 3-5 days/week)</option>
            <option value="very_active">Very Active (intense exercise 6-7 days/week)</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="w-full bg-zinc-800 text-zinc-200 py-2 rounded-md font-medium hover:bg-zinc-700"
          >
            Show Less
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded-md font-medium hover:bg-green-700 disabled:bg-zinc-700"
          >
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

        {saved && (
          <div className="text-green-400 text-sm font-medium">
            ✓ Profile saved successfully!
          </div>
        )}
      </form>
      )}
    </div>
  );
}
