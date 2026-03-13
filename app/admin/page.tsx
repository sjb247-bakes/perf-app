import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Users, Activity, TrendingUp, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = createClient()
  
  // 1. Check if user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')

  // 2. Fetch aggregate data
  const { count: userCount } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true })
  
  const { data: latestData } = await supabase
    .from('garmin_daily')
    .select(`
      *,
      user_profiles (display_name, email)
    `)
    .order('date', { ascending: false })
    .limit(50)

  // 3. Calculate averages
  const avgSleep = latestData?.length 
    ? Math.round(latestData.reduce((acc, curr) => acc + (curr.sleep_score || 0), 0) / latestData.filter(d => d.sleep_score).length)
    : 0
  const avgHRV = latestData?.length 
    ? Math.round(latestData.reduce((acc, curr) => acc + (curr.hrv_rmssd || 0), 0) / latestData.filter(d => d.hrv_rmssd).length)
    : 0

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Admin Command Center</h1>
            <p className="text-zinc-400 mt-2">Global insights and team performance metrics.</p>
          </div>
          <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-white transition-colors">
            Back to User View
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userCount}</div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Team Avg Sleep</CardTitle>
              <Activity className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgSleep}</div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Team Avg HRV</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgHRV}ms</div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">System Status</CardTitle>
              <AlertCircle className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-green-500 italic">Cloud Workers: Operational</div>
            </CardContent>
          </Card>
        </div>

        {/* User Stats Table */}
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader>
            <CardTitle>Recent Team Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-left">
                    <th className="h-12 px-4 font-medium">User</th>
                    <th className="h-12 px-4 font-medium">Date</th>
                    <th className="h-12 px-4 font-medium">Sleep</th>
                    <th className="h-12 px-4 font-medium">HRV</th>
                    <th className="h-12 px-4 font-medium">Stress</th>
                  </tr>
                </thead>
                <tbody>
                  {latestData?.map((row) => (
                    <tr key={`${row.user_id}-${row.date}`} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 font-medium">{row.user_profiles?.display_name || row.user_profiles?.email}</td>
                      <td className="p-4 text-zinc-400">{row.date}</td>
                      <td className={`p-4 font-bold ${row.sleep_score < 70 ? 'text-red-400' : 'text-green-400'}`}>
                        {row.sleep_score}
                      </td>
                      <td className="p-4">{row.hrv_rmssd}ms</td>
                      <td className="p-4 text-zinc-400">{row.avg_stress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
