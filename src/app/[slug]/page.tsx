import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BusinessLanding } from '@/components/booking/business-landing'

export default async function BusinessPage({ params }: { params: { slug: string } }) {
  const supabase = createClient()

  const [
    { data: business },
  ] = await Promise.all([
    supabase.from('businesses').select('id, name, phone, slug, timezone, address, description, cover_url, logo_url, brand_color, prepayment_mode, prepayment_value').eq('slug', params.slug).single(),
  ])

  if (!business) notFound()

  const [
    { data: services },
    { data: staff },
    { data: availability },
  ] = await Promise.all([
    supabase.from('services').select('*').eq('business_id', business.id).eq('is_active', true).order('price', { ascending: true }),
    supabase.from('staff').select('id, name').eq('business_id', business.id).eq('is_active', true),
    supabase.from('availability').select('day_of_week, start_hour, end_hour, is_active').eq('business_id', business.id).is('staff_id', null),
  ])

  return (
    <BusinessLanding
      business={business}
      services={services ?? []}
      staff={staff ?? []}
      availability={availability ?? []}
    />
  )
}
