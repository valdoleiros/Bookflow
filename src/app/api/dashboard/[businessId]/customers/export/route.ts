import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { businessId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceClient()
  const { data: business } = await admin
    .from('businesses').select('owner_id, name').eq('id', params.businessId).single()
  if (!business || business.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: customers } = await admin
    .from('customers')
    .select('name, phone, email, created_at')
    .eq('business_id', params.businessId)
    .order('created_at', { ascending: false })

  const rows = customers ?? []
  const header = 'Nome,Telefone,Email,Data de registo'
  const csv = [
    header,
    ...rows.map(c => [
      `"${(c.name ?? '').replace(/"/g, '""')}"`,
      `"${c.phone ?? ''}"`,
      `"${c.email ?? ''}"`,
      `"${c.created_at ? new Date(c.created_at).toLocaleDateString('pt-PT') : ''}"`,
    ].join(',')),
  ].join('\r\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="clientes-${params.businessId}.csv"`,
    },
  })
}
