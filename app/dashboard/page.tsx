'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Activity, Moon, Battery, Zap, Timer, Map, TrendingDown, TrendingUp, Settings } from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [wellness, setWellness] = useState<any>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [syncing, setSyncing] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await fetch('https://logqawepzcjniphiucce.supabase.co/functions/v1/garmin-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 1 })
      })
      await fetchData()
    } catch (e) {
      console.error('Sync failed:', e)
    } finally {
      setSyncing(false)
    }
  }

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)

      // 1. Fetch Latest Garmin Wellness
      const { data: garminData } = await supabase
        .from('garmin_daily')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .single()
      
      if (garminData) setWellness(garminData)

      // 2. Fetch Recent Strava Activities
      const { data: stravaData } = await supabase
        .from('strava_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false })
        .limit(5)
      
      if (stravaData) setActivities(stravaData)

    } catch (e) {
      console.error('Failed to fetch dashboard data:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-zinc-400 text-sm animate-pulse">Synchronizing performance data...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white pb-12">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-black tracking-tighter uppercase italic text-blue-500">Performance app</h1>
          <div className="flex items-center gap-4">
             <button 
                onClick={handleSync}
                disabled={syncing}
                className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors disabled:opacity-50"
             >
                {syncing ? 'Syncing...' : 'Sync Now'}
             </button>
             <Link href="/admin" className="text-xs text-zinc-500 hover:text-white transition-colors">Admin</Link>
             <Link href="/integrations">
                <Settings className="h-5 w-5 text-zinc-400 hover:text-white" />
             </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8 max-w-5xl">
        {/* Readiness Section */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">Readiness & Recovery</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-zinc-900 border-zinc-800 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-zinc-400">Sleep Score</p>
                  <Moon className="h-4 w-4 text-blue-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-black">{wellness?.sleep_score || '--'}</span>
                  <span className="text-xs text-zinc-500">/ 100</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-zinc-400">HRV (Last Night)</p>
                  <Activity className="h-4 w-4 text-green-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-black">{wellness?.hrv_rmssd || '--'}</span>
                  <span className="text-xs text-zinc-500">ms</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-zinc-400">Body Battery</p>
                  <Battery className="h-4 w-4 text-yellow-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-black">{wellness?.body_battery_high || '--'}</span>
                  <span className="text-xs text-zinc-500">Peak</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-zinc-400">Avg Stress</p>
                  <Zap className="h-4 w-4 text-purple-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-black">{wellness?.avg_stress || '--'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">Recent Activities</h2>
            <div className="space-y-3">
              {activities.length > 0 ? (
                activities.map((act) => (
                  <Card key={act.id} className="bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${act.type === 'Ride' ? 'bg-orange-600/10 text-orange-500' : 'bg-blue-600/10 text-blue-500'}`}>
                           <Activity className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm">{act.name}</h3>
                          <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-1">
                            <span className="flex items-center gap-1"><Map className="h-3 w-3" /> {(act.distance / 1000).toFixed(2)}km</span>
                            <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> {Math.floor(act.moving_time / 60)}m</span>
                            {act.average_heartrate && (
                              <span className="flex items-center gap-1">Avg HR: {Math.round(act.average_heartrate)}</span>
                            )}
                            <span className="text-zinc-600">|</span>
                            <span>{new Date(act.start_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-orange-500 uppercase tracking-tighter">Suffer Score</div>
                        <div className="text-xl font-black">{act.suffer_score || '0'}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
                  <p className="text-zinc-500 text-sm italic">No recent Strava activities found. Time to ride? 🚴‍♂️</p>
                </div>
              )}
            </div>
          </div>

          {/* Training Load Column */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">Training Load</h2>
            <Card className="bg-zinc-900 border-zinc-800 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Weekly Effort</CardTitle>
                <CardDescription className="text-[10px]">Combined Suffer Score (Last 7 Days)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black text-orange-500">
                  {activities.reduce((acc, curr) => acc + (curr.suffer_score || 0), 0)}
                </div>
                <div className="mt-4 h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                   <div className="bg-orange-500 h-full w-[65%]" />
                </div>
                <p className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" /> 12% higher than last week
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
