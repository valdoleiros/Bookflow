import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import DashboardClient from '@/components/dashboard/DashboardClient'

export default async function DashboardPage({ params }: { params: { businessId: string } }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', params.businessId)
    .single()

  if (!business) notFound()

  if (business.owner_id !== user.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background/50 text-center p-4">
        <div className="bg-card/60 p-8 rounded-3xl border border-border/30 max-w-md">
          <h1 className="text-xl font-bold text-foreground mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground text-sm">Não tens permissão para aceder a esta dashboard.</p>
          <a href="/login" className="text-primary mt-4 inline-block font-semibold">Voltar ao Login</a>
        </div>
      </div>
    )
  }

  const [{ data: services }, { data: availability }] = await Promise.all([
    supabase.from('services').select('*').eq('business_id', params.businessId).order('created_at'),
    supabase.from('availability').select('*').eq('business_id', params.businessId).order('day_of_week'),
  ])

  return (
    <DashboardClient
      business={business}
      services={services ?? []}
      availability={availability ?? []}
    />
  )
}
