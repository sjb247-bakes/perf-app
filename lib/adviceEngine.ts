import { supabase } from './supabase';

interface DailyData {
  garminReadiness: number; // 0-100
  physicalEnergy: number; // 1-10
  mentalFocus: number; // 1-10
  stressLevel: number; // 1-10
  jobType: 'physical' | 'desk' | 'hybrid';
  sleepScore: number; // 0-100
  hrv: number; // in ms
  bodyBattery: number; // 0-100
  notes?: string;
}

export interface AdviceOutput {
  overallStatus: 'green' | 'yellow' | 'red';
  deltaAnalysis: string;
  gaps: {
    type: 'adrenaline' | 'slump' | 'aligned' | 'hidden_fatigue';
    description: string;
  }[];
  recommendation: string;
  reasoning: string;
  contextualNote: string;
}

/**
 * Fetch all data needed for the advice engine
 */
export async function fetchDailyData(userId: string): Promise<DailyData | null> {
  const today = new Date().toISOString().split('T')[0];

  try {
    // Fetch Garmin daily data
    const { data: garminData } = await supabase
      .from('garmin_daily')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    // Fetch subjective check-in
    const { data: checkIn } = await supabase
      .from('subjective_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    // Fetch user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!garminData || !checkIn || !profile) {
      return null;
    }

    return {
      garminReadiness: garminData.readiness_score || (garminData.sleep_score || 50), // fallback to sleep score if no readiness
      physicalEnergy: checkIn.physical_energy || 5,
      mentalFocus: checkIn.mental_focus || 5,
      stressLevel: checkIn.stress_level || 5,
      jobType: profile.job_type || 'desk',
      sleepScore: garminData.sleep_score || 50,
      hrv: garminData.hrv_rmssd || 40, // Use hrv_rmssd column
      bodyBattery: garminData.body_battery_high || 50, // Use body_battery_high column
      notes: checkIn.notes,
    };
  } catch (error) {
    console.error('Error fetching daily data:', error);
    return null;
  }
}

/**
 * Core advice engine: analyzes data and generates recommendations
 */
export function generateAdvice(data: DailyData): AdviceOutput {
  const gaps: AdviceOutput['gaps'] = [];
  let overallStatus: AdviceOutput['overallStatus'] = 'green';

  // Convert subjective scores to 0-100 scale for comparison
  const subjective_score = (data.physicalEnergy + data.mentalFocus + (10 - data.stressLevel)) / 3 * 10;
  const objective_score = (data.garminReadiness + data.sleepScore) / 2;

  const delta = subjective_score - objective_score;

  // Gap Analysis
  if (delta > 30) {
    // ADRENALINE GAP: Feeling great, but data is poor
    gaps.push({
      type: 'adrenaline',
      description: `You're running on ${delta > 40 ? 'SERIOUS' : 'significant'} adrenaline/willpower. Your watch says you're cooked, but you feel invincible.`,
    });
    overallStatus = 'yellow';
  } else if (delta < -30) {
    // SLUMP GAP: Data is good, but feeling meh
    gaps.push({
      type: 'slump',
      description: 'Your recovery looks solid on paper, but your head is not in the game. Mental fatigue might be the issue.',
    });
  } else if (Math.abs(delta) <= 10) {
    // ALIGNED
    gaps.push({
      type: 'aligned',
      description: 'Your body and mind are in agreement. You can trust your instinct today.',
    });
  }

  // Hidden fatigue check: Good subjective score but bad objective metrics
  if (data.physicalEnergy >= 7 && objective_score < 40) {
    gaps.push({
      type: 'hidden_fatigue',
      description: 'You think you feel good, but your sleep and recovery metrics are concerning. You might be in denial.',
    });
    overallStatus = 'red';
  }

  // Determine overall status based on objective metrics
  if (objective_score < 30) {
    overallStatus = 'red';
  } else if (objective_score < 50) {
    overallStatus = objective_score < 40 ? 'red' : 'yellow';
  }

  // Generate contextual recommendation based on job type
  const recommendation = generateJobAwareRecommendation(data, objective_score, gaps);

  return {
    overallStatus,
    deltaAnalysis: `Subjective Score: ${Math.round(subjective_score)}/100 | Objective Score: ${Math.round(objective_score)}/100 | Delta: ${delta > 0 ? '+' : ''}${Math.round(delta)}`,
    gaps,
    recommendation: recommendation.text,
    reasoning: recommendation.reasoning,
    contextualNote: recommendation.contextualNote,
  };
}

/**
 * Generate job-aware recommendations
 */
function generateJobAwareRecommendation(
  data: DailyData,
  objective_score: number,
  gaps: AdviceOutput['gaps']
) {
  const hasAdrenalineGap = gaps.some((g) => g.type === 'adrenaline');

  if (objective_score >= 75) {
    return {
      text: '🟢 GREEN LIGHT. You can push today. If you want a hard session, go for it.',
      reasoning: 'Your readiness, sleep, and HRV all indicate good recovery.',
      contextualNote: `Because you do ${data.jobType} work, make sure you don't double-down fatigue across training AND your job.`,
    };
  }

  if (objective_score >= 50) {
    if (data.jobType === 'physical') {
      return {
        text: '🟡 YELLOW LIGHT. You can train, but be strategic. Your job is already physically taxing.',
        reasoning: `Your readiness is ${Math.round(objective_score)}/100—moderate but not peak.`,
        contextualNote: `Since you do physical work, a hard training session today + a heavy work day = compounding fatigue. Stick to Z1/Z2 or cross-training (bike, swim, run something different from your usual).`,
      };
    } else if (data.jobType === 'desk') {
      return {
        text: '🟡 YELLOW LIGHT. You can still train, but keep it moderate (Z2 endurance).',
        reasoning: `Your readiness is moderate (${Math.round(objective_score)}/100). Not peak, but workable.`,
        contextualNote: `Your desk job gives you flexibility. If you're mentally tired, a recovery spin might actually help clear your head.`,
      };
    } else {
      return {
        text: '🟡 YELLOW LIGHT. Be smart with your mix today.',
        reasoning: `Your readiness is moderate. Your hybrid role means you're already juggling physical and mental load.`,
        contextualNote: `If your job day was heavy (lots of meetings or manual work), keep training light. If it was light, you can push a bit.`,
      };
    }
  }

  if (objective_score < 50) {
    if (hasAdrenalineGap) {
      return {
        text: '🔴 RED LIGHT + ADRENALINE ZONE. High injury risk. BACK OFF.',
        reasoning: `Your data is poor (${Math.round(objective_score)}/100), but you feel invincible. This is when bad things happen.`,
        contextualNote: `If you do physical work, you NEED recovery today. A hard training session on top of that is asking for an injury or burnout. Rest > risk.`,
      };
    }

    if (data.jobType === 'physical') {
      return {
        text: '🔴 RED LIGHT. Your readiness is low. Focus on recovery.',
        reasoning: `You're fatigued (${Math.round(objective_score)}/100). Your job already demands physical energy.`,
        contextualNote: `Since you do physical work, training hard today is not realistic. Gentle movement (walk, yoga) or full rest is your play.`,
      };
    } else {
      return {
        text: '🔴 RED LIGHT. Skip hard training. Recovery day.',
        reasoning: `Your readiness is low (${Math.round(objective_score)}/100). Your sleep and HRV need support.`,
        contextualNote: `You have the luxury of desk work, so use your time to sleep more, hydrate, and let your nervous system recover.`,
      };
    }
  }

  return {
    text: 'DATA UNCLEAR. Check your Garmin sync.',
    reasoning: 'Not enough data to make a call.',
    contextualNote: 'Make sure your watch is syncing properly.',
  };
}
