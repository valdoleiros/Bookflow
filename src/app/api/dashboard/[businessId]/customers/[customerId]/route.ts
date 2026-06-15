import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// RGPD Art. 17 — Right to erasure.
// We anonymise rather than hard-delete so the business retains aggregate booking stats
// without any personally identifiable information.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { businessId: string; customerId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceClient()

  const { data: business } = await admin
    .from('businesses').select('owner_id').eq('id', params.businessId).single()
  if (!business || business.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify customer belongs to this business
  const { data: customer } = await admin
    .from('customers')
    .select('id')
    .eq('id', params.customerId)
    .eq('business_id', params.businessId)
    .single()
  if (!customer) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })

  // Anonymise — replaces PII with neutral values, preserves booking history for stats
  await admin.from('customers').update({
    name:              'Utilizador Removido',
    phone:             `deleted_${params.customerId.slice(0, 8)}`,
    email:             null,
    sms_consent:       false,
    sms_consent_at:    null,
    last_reengagement_at: null,
  }).eq('id', params.customerId)

  return NextResponse.json({ message: 'Dados pessoais removidos (RGPD Art. 17).' })
}
