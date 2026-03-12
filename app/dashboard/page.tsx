import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LogOut, User, Settings, Link2 } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch latest Garmin data for THIS user
  const { data: metrics, error } = await supabase
    .from("garmin_daily")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(7);

  const latest = metrics?.[0];

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold tracking-tighter">
            Performance
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/profile" className="text-zinc-400 hover:text-white transition-colors">
              <User className="h-5 w-5" />
            </Link>
            <Link href="/integrations" className="text-zinc-400 hover:text-white transition-colors">
              <Link2 className="h-5 w-5" />
            </Link>
            <form action="/api/auth/signout" method="post">
              <button className="text-zinc-400 hover:text-white transition-colors">
                <LogOut className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome, {user.user_metadata?.display_name || 'User'}</h1>
            <p className="text-zinc-400 mt-1">Here's your performance overview for {latest?.date ? new Date(latest.date).toLocaleDateString() : 'today'}.</p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard 
              label="Sleep Score" 
              value={latest?.sleep_score} 
              unit="" 
              status={latest?.sleep_score >= 80 ? 'good' : latest?.sleep_score >= 60 ? 'okay' : 'poor'} 
            />
            <MetricCard 
              label="HRV (Last)" 
              value={latest?.hrv_last} 
              unit="ms" 
              status={latest?.hrv_status === 'balanced' ? 'good' : 'okay'} 
            />
            <MetricCard 
              label="Body Battery" 
              value={latest?.bb_wake} 
              unit="" 
              status={latest?.bb_wake >= 75 ? 'good' : latest?.bb_wake >= 50 ? 'okay' : 'poor'} 
            />
            <MetricCard 
              label="Stress" 
              value={latest?.avg_stress} 
              unit="" 
              status={latest?.avg_stress < 25 ? 'good' : latest?.avg_stress < 50 ? 'okay' : 'poor'} 
            />
          </div>

          {/* Detailed View (Placeholder for now) */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-zinc-400">Sleep Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                    <span className="text-zinc-400">Duration</span>
                    <span className="font-medium">{latest?.sleep_secs ? (latest.sleep_secs / 3600).toFixed(1) : '--'} hrs</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                    <span className="text-zinc-400">Deep Sleep</span>
                    <span className="font-medium text-blue-400">{latest?.deep_pct ? `${latest.deep_pct}%` : '--'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                    <span className="text-zinc-400">REM Sleep</span>
                    <span className="font-medium text-purple-400">{latest?.rem_pct ? `${latest.rem_pct}%` : '--'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-zinc-400">HRV & Readiness</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                    <span className="text-zinc-400">Status</span>
                    <span className={`font-medium capitalize ${latest?.hrv_status === 'balanced' ? 'text-green-400' : 'text-yellow-400'}`}>
                      {latest?.hrv_status || '--'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                    <span className="text-zinc-400">Weekly Avg</span>
                    <span className="font-medium">{latest?.hrv_weekly || '--'} ms</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                    <span className="text-zinc-400">SpO2 Avg</span>
                    <span className="font-medium">{latest?.spo2_avg || '--'}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ label, value, unit, status }: { label: string, value: any, unit: string, status: 'good' | 'okay' | 'poor' }) {
  const statusColors = {
    good: 'text-green-400',
    okay: 'text-yellow-400',
    poor: 'text-red-400'
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-6">
        <p className="text-sm font-medium text-zinc-400 uppercase tracking-wider">{label}</p>
        <div className="flex items-baseline gap-1 mt-2">
          <span className={`text-3xl font-bold ${statusColors[status]}`}>
            {value !== undefined ? value : '--'}
          </span>
          <span className="text-zinc-500 text-sm">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}
