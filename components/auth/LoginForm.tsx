'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import Link from 'next/link'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-white">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center">Log In</CardTitle>
        <CardDescription className="text-zinc-400 text-center">
          Enter your email and password to access your dashboard
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-700"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button 
            className="w-full bg-white text-zinc-950 hover:bg-zinc-200" 
            type="submit" 
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </Button>
          <div className="text-center text-sm text-zinc-400">
            Don't have an account?{' '}
            <Link href="/signup" className="text-white hover:underline underline-offset-4">
              Sign Up
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
