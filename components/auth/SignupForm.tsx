'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import Link from 'next/link'

export default function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setMessage('Check your email for the confirmation link.')
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-white">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center">Create Account</CardTitle>
        <CardDescription className="text-zinc-400 text-center">
          Sign up to start tracking your performance
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSignup}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-500 px-4 py-2 rounded-md text-sm">
              {message}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Your Name"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-700"
            />
          </div>
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
            <Label htmlFor="password">Password</Label>
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
            {loading ? 'Creating account...' : 'Sign Up'}
          </Button>
          <div className="text-center text-sm text-zinc-400">
            Already have an account?{' '}
            <Link href="/login" className="text-white hover:underline underline-offset-4">
              Log In
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
