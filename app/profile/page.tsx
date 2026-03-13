'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, User, Send, Bell } from 'lucide-react'
import Link from 'next/link'
import DailyCheckIn from '@/app/components/DailyCheckIn'

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState('')
  const [telegramId, setTelegramId] = useState('')
  const [notificationChannel, setNotificationChannel] = useState('email')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setPageLoading(false); return }

      let { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      // Support schemas that use user_id instead of id.
      if (error?.message?.includes("column 'id'")) {
        const fallback = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
        data = fallback.data
        error = fallback.error
      }
      
      if (data) {
        setDisplayName(data.display_name || '')
        setTelegramId(data.telegram_chat_id || '')
        setNotificationChannel(data.notification_channel || 'email')
      }
    } catch (e) {
      console.error('Failed to fetch profile:', e)
    } finally {
      setPageLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setStatus({ type: 'error', message: 'You need to be logged in.' })
      setLoading(false)
      return
    }

    let { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        display_name: displayName,
        telegram_chat_id: telegramId,
        notification_channel: notificationChannel
      }, { onConflict: 'id' })

    // Support schemas that use user_id instead of id.
    if (error?.message?.includes("column 'id'")) {
      const fallback = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          display_name: displayName,
          telegram_chat_id: telegramId,
          notification_channel: notificationChannel
        }, { onConflict: 'user_id' })
      error = fallback.error
    }

    if (error) {
      setStatus({ type: 'error', message: error.message })
    } else {
      setStatus({ type: 'success', message: 'Profile updated successfully! ✅' })
    }
    setLoading(false)
  }

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-zinc-400 text-sm">Loading profile...</div>
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
            <h1 className="text-xl font-bold tracking-tighter">Profile</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-8">
          {/* Daily Check-in */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-4">Daily Check-in</h2>
            <DailyCheckIn />
          </div>

          {/* Settings Section */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Your Settings</h2>
            <p className="text-zinc-400 mt-2">Manage your display name and notification preferences.</p>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <div className="space-y-6">
              {/* Account Card */}
              <Card className="bg-zinc-900 border-zinc-800 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-zinc-400" />
                    Personal Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {status && (
                    <div className={`px-4 py-2 rounded-md text-sm border ${
                      status.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-red-500/10 border-red-500/50 text-red-500'
                    }`}>
                      {status.message}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-zinc-300">Display Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Bakes"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-700"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Notifications Card */}
              <Card className="bg-zinc-900 border-zinc-800 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-zinc-400" />
                    Notifications
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    Where do you want to receive your daily performance brief?
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Briefing Channel</Label>
                    <Select value={notificationChannel} onValueChange={setNotificationChannel}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 focus:ring-zinc-700">
                        <SelectValue placeholder="Select a channel" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                        <SelectItem value="email">Email Only</SelectItem>
                        <SelectItem value="telegram">Telegram Bot</SelectItem>
                        <SelectItem value="both">Email & Telegram</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telegram" className="text-zinc-300 flex items-center gap-2">
                      <Send className="h-4 w-4 text-zinc-400" />
                      Telegram Chat ID
                    </Label>
                    <Input
                      id="telegram"
                      placeholder="e.g. 7297688368"
                      value={telegramId}
                      onChange={(e) => setTelegramId(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-700 font-mono text-sm"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">
                      You can get this by messaging @userinfobot on Telegram.
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full bg-white text-black hover:bg-zinc-200 font-semibold" 
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Update Settings'}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
