import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/design-system/card';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--lighter-blue)] to-[var(--dark-blue)] p-8">
      <div className="container mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold text-white mb-4">Dashboard</h1>
        <Card variant="glass" padding="md">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--muted-text)]">
              Signed in as <span className="font-medium text-foreground">{user?.email}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
