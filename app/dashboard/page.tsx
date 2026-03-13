import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardContent from '@/app/components/DashboardContent';

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <DashboardContent />;
}
