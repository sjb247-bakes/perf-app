'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { ShieldCheck, ArrowLeft, Activity, Mail, Lock } from 'lucide-react'
import Link from 'next/link'

export default function IntegrationsPage() {
  const [garminEmail, setGarminEmail] = useState('')
  const [garminPassword, setGarminPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [integrations, setIntegrations] = useState<any[]>([])
  
  const supabase = createClient()

  useEffect(() => {
    fetchIntegrations()
  }, [])

  const fetchIntegrations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setPageLoading(false); return }

      const { data } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', user.id)
      
      if (data) setIntegrations(data)
    } catch (e) {
      console.error('Failed to fetch integrations:', e)
    } finally {
      setPageLoading(false)
    }
  }

  const handleGarminConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStatus({ type: 'error', message: 'Not logged in. Please refresh.' }); setLoading(false); return }

    // Send to server route — credentials are encrypted before storage
    const res = await fetch('/api/integrations/garmin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: garminEmail, password: garminPassword })
    })

    const result = await res.json()

    if (!res.ok) {
      setStatus({ type: 'error', message: result.error || 'Failed to save credentials' })
    } else {
      setStatus({ type: 'success', message: 'Garmin account connected securely! 🔐' })
      setGarminPassword('')
      fetchIntegrations()
    }
    setLoading(false)
  }

  const handleStravaConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID
    if (!clientId) {
      setStatus({ type: 'error', message: 'Strava Client ID not configured. Please check .env.local' })
      return
    }
    const redirectUri = `${window.location.origin}/api/auth/strava/callback`
    const scope = 'read,activity:read_all'
    const url = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`
    window.location.href = url
  }

  const isGarminConnected = integrations.some(i => i.service === 'garmin')
  const isStravaConnected = integrations.some(i => i.service === 'strava')

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-zinc-400 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold tracking-tighter">Integrations</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Connect Your Data</h2>
            <p className="text-zinc-400 mt-2">Link your wearables to start tracking your performance metrics.</p>
          </div>

          {/* Garmin Connect */}
          <Card className="bg-zinc-900 border-zinc-800 text-white overflow-hidden">
            <div className="bg-blue-600 px-6 py-2 flex items-center gap-2">
              <Activity className="h-4 w-4 text-white" />
              <span className="text-xs font-bold uppercase tracking-wider">Garmin Connect</span>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Connect Garmin
                {isGarminConnected && (
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/50">
                    Connected
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Enter your Garmin Connect credentials to sync your daily HRV, Sleep, and Body Battery data.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleGarminConnect}>
              <CardContent className="space-y-4">
                {status && (
                  <div className={`px-4 py-2 rounded-md text-sm border ${
                    status.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-red-500/10 border-red-500/50 text-red-500'
                  }`}>
                    {status.message}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-zinc-300">Garmin Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@email.com"
                      required
                      value={garminEmail}
                      onChange={(e) => setGarminEmail(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 pl-10 focus-visible:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pass" className="text-zinc-300">Garmin Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                      id="pass"
                      type="password"
                      required
                      value={garminPassword}
                      onChange={(e) => setGarminPassword(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 pl-10 focus-visible:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-start gap-3 bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                  <ShieldCheck className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-zinc-500 leading-relaxed">
                    <p className="font-semibold text-zinc-300 mb-1">Encrypted & Secure</p>
                    Your credentials are stored in Supabase Vault, encrypted at rest. We only use them to sync your performance data.
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold" 
                  disabled={loading}
                >
                  {loading ? 'Connecting...' : isGarminConnected ? 'Update Connection' : 'Connect Garmin Account'}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Strava */}
          <Card className={`bg-zinc-900 border-zinc-800 text-white transition-opacity ${!isStravaConnected && 'opacity-90'}`}>
            <div className="bg-orange-600 px-6 py-2 flex items-center gap-2">
              <Activity className="h-4 w-4 text-white" />
              <span className="text-xs font-bold uppercase tracking-wider">Strava</span>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Strava Integration
                {isStravaConnected && (
                  <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full border border-orange-500/50">
                    Connected
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Connect your Strava account to sync your activities and layer your training load over your recovery data.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button 
                onClick={handleStravaConnect}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold"
              >
                {isStravaConnected ? 'Reconnect Strava' : 'Connect Strava'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
