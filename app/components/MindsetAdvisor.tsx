'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { fetchDailyData, generateAdvice, AdviceOutput } from '@/lib/adviceEngine';

export default function MindsetAdvisor() {
  const { user } = useUser();
  const [advice, setAdvice] = useState<AdviceOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadAdvice = async () => {
      try {
        const data = await fetchDailyData(user.id);
        if (!data) {
          setError('Complete your daily check-in and ensure Garmin data has synced.');
          setLoading(false);
          return;
        }

        const adviceOutput = generateAdvice(data);
        setAdvice(adviceOutput);
        setError(null);
      } catch (err) {
        console.error('Error loading advice:', err);
        setError('Failed to generate advice. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadAdvice();
  }, [user]);

  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-lg shadow-md p-6 mb-6 animate-pulse border border-zinc-800">
        <div className="h-6 bg-zinc-700 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-zinc-700 rounded w-full mb-2"></div>
        <div className="h-4 bg-zinc-700 rounded w-3/4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-6 mb-6">
        <p className="text-sm text-yellow-200">{error}</p>
      </div>
    );
  }

  if (!advice) {
    return null;
  }

  const statusColors = {
    green: 'bg-green-900 border-green-700',
    yellow: 'bg-yellow-900 border-yellow-700',
    red: 'bg-red-900 border-red-700',
  };

  const statusEmoji = {
    green: '🟢',
    yellow: '🟡',
    red: '🔴',
  };

  const statusLabel = {
    green: 'READY',
    yellow: 'CAUTION',
    red: 'REST DAY',
  };

  return (
    <div className={`border-l-4 rounded-lg shadow-md p-6 mb-6 ${statusColors[advice.overallStatus]} border-r border-t border-b`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{statusEmoji[advice.overallStatus]}</span>
          <div>
            <h2 className="text-lg font-bold text-white">Today's Mindset Advice</h2>
            <p className="text-sm text-zinc-400">{statusLabel[advice.overallStatus]}</p>
          </div>
        </div>
      </div>

      {/* Delta Analysis */}
      <div className="bg-zinc-800 rounded px-3 py-2 mb-4 text-xs text-zinc-300 border border-zinc-700 font-mono">
        {advice.deltaAnalysis}
      </div>

      {/* Main Recommendation */}
      <div className="mb-4">
        <p className="text-base font-semibold mb-2 text-white">{advice.recommendation}</p>
        <p className="text-sm text-zinc-300 mb-3">{advice.reasoning}</p>
      </div>

      {/* Gaps / Alerts */}
      {advice.gaps.length > 0 && (
        <div className="mb-4 space-y-2">
          {advice.gaps.map((gap, idx) => (
            <div
              key={idx}
              className={`p-3 rounded text-sm ${
                gap.type === 'adrenaline'
                  ? 'bg-orange-900 text-orange-200 border border-orange-700'
                  : gap.type === 'slump'
                  ? 'bg-purple-900 text-purple-200 border border-purple-700'
                  : gap.type === 'hidden_fatigue'
                  ? 'bg-red-900 text-red-200 border border-red-700'
                  : 'bg-green-900 text-green-200 border border-green-700'
              }`}
            >
              <strong>
                {gap.type === 'adrenaline' && '⚡ Adrenaline Zone:'}
                {gap.type === 'slump' && '🧠 Mental Slump:'}
                {gap.type === 'hidden_fatigue' && '⚠️ Hidden Fatigue:'}
                {gap.type === 'aligned' && '✓ Aligned:'}
              </strong>{' '}
              {gap.description}
            </div>
          ))}
        </div>
      )}

      {/* Contextual Note */}
      <div className="bg-blue-900 border border-blue-700 rounded p-3 text-sm text-blue-200">
        <strong>💡 Context Matters:</strong> {advice.contextualNote}
      </div>
    </div>
  );
}
