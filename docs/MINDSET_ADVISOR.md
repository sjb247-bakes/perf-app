# Mindset Advisor & Real-World Context

## Overview

The **Mindset Advisor** is the intelligent heart of the Performance Dashboard. It goes beyond raw metrics to provide **realistic, job-aware advice** that respects the complexity of modern life.

**Core Philosophy:** Your watch data doesn't tell the whole story. Neither does how you feel in a vacuum. The Mindset Advisor bridges the gap by comparing **objective metrics** (Garmin readiness, sleep, HRV) with **subjective reality** (how you actually feel) while accounting for **your life context** (job type, baseline activity).

---

## Features

### 1. Daily Check-in (`DailyCheckIn.tsx`)

Users log three subjective metrics each morning:
- **Physical Energy (1-10):** How rested is your body?
- **Mental Focus (1-10):** How sharp is your mind?
- **Stress Level (1-10):** How overwhelmed are you?
- **Optional Notes:** Context (e.g., "Only slept 6 hours", "Heavy work day")

**Storage:** `subjective_logs` table in Supabase
- Unique constraint: One check-in per user per day
- RLS enabled: Users can only see/edit their own data

### 2. Profile Settings (`ProfileSettings.tsx`)

Users define their baseline context:
- **Job Type:** Physical, Desk, or Hybrid
  - *Physical (tradie/manual work):* Requires different advice (can't "just rest")
  - *Desk (office work):* More flexibility for recovery
  - *Hybrid:* Mix of both
- **Baseline Activity Level:** Sedentary, Lightly Active, Active, Very Active
  - Helps calibrate what "normal" recovery looks like for this person

**Storage:** `user_profiles` table in Supabase

---

## The Advice Engine (`adviceEngine.ts`)

### Data Integration

1. **Garmin Daily Data:** readiness_score, sleep_score, HRV, body_battery
2. **Subjective Logs:** physical_energy, mental_focus, stress_level
3. **User Profile:** job_type, baseline_activity_level

### Delta Analysis

The engine converts everything to a 0-100 scale and compares:

```
Subjective Score = (physical_energy + mental_focus + (10 - stress_level)) / 3 × 10
Objective Score = (garmin_readiness + sleep_score) / 2
Delta = Subjective - Objective
```

**Interpretation:**

| Delta | Meaning | Danger |
|-------|---------|--------|
| **+30 to +50** | **Adrenaline Zone** | You feel invincible but your body is cooked. Classic injury setup. |
| **+10 to +30** | **Running on fumes** | Willpower masking fatigue. Manageable but watch out. |
| **-10 to +10** | **Aligned** | Your body and mind agree. Trust yourself. |
| **-30 to -10** | **Mental Slump** | Your recovery is fine, but your head is tired. Psych issue. |
| **<-30** | **Hidden Fatigue** | You're denying real fatigue. This is denial territory. |

### Recommendation Logic

**Status:** 🟢 GREEN / 🟡 YELLOW / 🔴 RED

Status is determined by:
1. Objective score (readiness + sleep)
2. Presence of adrenaline gap or hidden fatigue
3. Job type context

**Job-Aware Advice:**

#### 🔴 RED (Objective Score < 50)

**Physical Job:**
- "Your job is already taxing. Training hard today = injury waiting to happen. Rest or gentle movement only."

**Desk Job:**
- "You have flexibility. Use it to sleep more, hydrate, let your nervous system recover. Desk work gives you that luxury."

**Hybrid:**
- "Depends on today's job load. If it was heavy, recovery day. If it was light, you can push."

#### 🟡 YELLOW (Objective Score 50-75)

**Physical Job:**
- "You can train, but be strategic. Stick to Z1/Z2 or cross-train something different from your job."
- *Rationale:* Compounding fatigue across job + hard training = burnout

**Desk Job:**
- "Moderate training is fine. A recovery spin might actually help clear mental fatigue."

#### 🟢 GREEN (Objective Score 75+)

- "You can push today. If you want a hard session, go for it."
- *Note:* Still cautions against doubling fatigue across job + training

---

## Special Cases

### 1. Adrenaline Gap (Delta > +30)

```
⚡ You're running on adrenaline/willpower. 
Your watch says you're cooked, but you feel invincible.
```

**Advice:**
- If job is physical: "You NEED recovery. A hard session + your job = injury waiting to happen."
- If job is desk: "High injury risk. Back off."

**Why:** Adrenaline masks fatigue. The nervous system is fried but hormones are keeping you awake. This is when ACL tears, stress fractures, and burnout happen.

### 2. Hidden Fatigue (Good subjective, poor objective)

```
⚠️ You think you feel good, but sleep/HRV is concerning.
You might be in denial.
```

**Advice:** "Your recovery looks bad on paper. Stop denying it. You need rest more than you need training."

### 3. Mental Slump (Good objective, poor subjective)

```
🧠 Your recovery looks solid, but your head is not in the game.
Mental fatigue might be the issue.
```

**Advice:** "Your engine is fine, but the driver is tired. Maybe a change of scenery or an easy spin helps clear your head."

---

## Database Schema

### `subjective_logs`
```sql
id BIGSERIAL PRIMARY KEY
user_id UUID (FK → auth.users)
date DATE (UNIQUE per user)
physical_energy SMALLINT (1-10)
mental_focus SMALLINT (1-10)
stress_level SMALLINT (1-10)
notes TEXT
created_at TIMESTAMP
```

### `user_profiles`
```sql
user_id UUID PRIMARY KEY (FK → auth.users)
full_name TEXT
job_type TEXT ('physical' | 'desk' | 'hybrid')
baseline_activity_level TEXT ('sedentary' | 'lightly_active' | 'active' | 'very_active')
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

## Frontend Integration

### Daily Flow

1. **User opens dashboard**
2. **MindsetAdvisor component loads:**
   - Calls `fetchDailyData(user_id)`
   - Fetches Garmin, subjective_logs, user_profiles for today
   - Calls `generateAdvice(data)`
   - Displays status + gaps + recommendation + contextual note

3. **If no data:** Prompts user to complete check-in and ensure Garmin sync

### Components

- **`DailyCheckIn`**: Simple form to log 3 scores + notes
- **`ProfileSettings`**: Onboarding for job type and baseline activity
- **`MindsetAdvisor`**: Display layer showing advice with color-coded status
- **`Dashboard`**: Orchestrates everything

---

## Next Steps

1. **Real-time Garmin Sync:** Ensure daily data is populated from Garmin API
2. **Historical Analysis:** Show trends over time (adrenaline zones, HRV recovery)
3. **Workout Recommendations:** "Given your state, here are 3 workout options..."
4. **Predictive Model:** ML model to predict recovery score based on historical patterns
5. **Coach Integration:** Allow coaches to see athlete's real-time readiness (with permission)

---

## Philosophy Note

This feature is built on the recognition that **metrics alone are lies, feelings alone are lies, and context matters.**

A doctor can't treat you without knowing your job stresses and life situation. Neither can an AI coach.
