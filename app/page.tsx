import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-950 text-white">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col gap-8">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-center">
          Performance & Mindset
        </h1>
        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl text-center">
          Track your daily metrics, understand your readiness, and master your mind.
        </p>
        
        <div className="flex gap-4 mt-8">
          <Link 
            href="/login" 
            className="px-8 py-3 rounded-md bg-white text-zinc-950 font-medium hover:bg-zinc-200 transition-colors"
          >
            Log In
          </Link>
          <Link 
            href="/signup" 
            className="px-8 py-3 rounded-md bg-transparent border border-zinc-700 text-white font-medium hover:bg-zinc-800 transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}
