// src/app/api/slots/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateSlots } from '@/lib/slots'
import { parseISO, isValid } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const businessId = searchParams.get('business_id')
    const serviceId = searchParams.get('service_id')
    const dateParam = searchParams.get('date') // YYYY-MM-DD

    if (!businessId || !serviceId || !dateParam) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const requestedDate = parseISO(dateParam)
    if (!isValid(requestedDate)) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Build correct UTC day boundaries without timezone shifting
    const dayStart = new Date(`${dateParam}T00:00:00.000Z`)
    const dayEnd = new Date(`${dateParam}T23:59:59.999Z`)

    // Fetch all required data in parallel!
    const [
      { data: business, error: bizErr },
      { data: service, error: svcErr },
      { data: availability, error: availErr },
      { data: bookings, error: bookErr },
      { data: closedPeriods, error: closedErr },
      { data: staffList, error: staffErr }
    ] = await Promise.all([
      supabase.from('businesses').select('id, timezone').eq('id', businessId).single(),
      supabase.from('services').select('duration_minutes').eq('id', serviceId).eq('business_id', businessId).single(),
      supabase.from('availability').select('*').eq('business_id', businessId).eq('is_active', true),
      supabase.from('bookings').select('id, start_time, end_time, status, staff_id').eq('business_id', businessId).neq('status', 'cancelled').gte('start_time', dayStart.toISOString()).lte('start_time', dayEnd.toISOString()),
      supabase.from('closed_periods').select('*').eq('business_id', businessId).eq('date', dateParam),
      supabase.from('staff').select('id').eq('business_id', businessId).eq('is_active', true)
    ])

    if (bizErr || !business) {
      return NextResponse.json({ error: 'Business not found', details: bizErr }, { status: 404 })
    }

    if (svcErr || !service) {
      return NextResponse.json({ error: 'Service not found', details: svcErr }, { status: 404 })
    }
    
    if (availErr || bookErr || closedErr || staffErr) {
      return NextResponse.json({ error: 'Database error fetching data', details: { availErr, bookErr, closedErr, staffErr } }, { status: 500 })
    }

    const requestedStaffId = searchParams.get('staff_id')
    
    // Se não houver staff registado, usamos um "staff virtual" (id null) para manter a compatibilidade
    const activeStaffIds = (staffList && staffList.length > 0) ? staffList.map((s: any) => s.id) : [null]
    
    // Se o cliente escolheu um barbeiro, filtramos a lista
    const staffToEvaluate = requestedStaffId ? activeStaffIds.filter((id: any) => id === requestedStaffId) : activeStaffIds

    let aggregatedSlots: Record<string, boolean> = {}

    for (const sId of staffToEvaluate) {
      // Filtramos as disponibilidades para este barbeiro OU para a loja geral (staff_id nulo/undefined)
      const staffAvailability = (availability ?? []).filter((a: any) => a.staff_id === sId || a.staff_id === null || a.staff_id === undefined)
      
      // Para horários semanais, prioridade à regra específica do barbeiro
      const resolvedAvailability = []
      for (let i = 0; i < 7; i++) {
        const specific = staffAvailability.find((a: any) => a.day_of_week === i && a.staff_id === sId && sId !== null)
        const general = staffAvailability.find((a: any) => a.day_of_week === i && (a.staff_id === null || a.staff_id === undefined))
        if (specific) resolvedAvailability.push(specific)
        else if (general) resolvedAvailability.push(general)
      }

      // BOOKINGS: Só bloquear com marcações deste barbeiro específico
      const staffBookings = sId !== null
        ? (bookings ?? []).filter((b: any) => b.staff_id === sId)
        : (bookings ?? []).filter((b: any) => b.staff_id === null || b.staff_id === undefined)

      // CLOSED PERIODS: null = loja toda fechada, uuid = só esse barbeiro
      const staffClosed = (closedPeriods ?? []).filter((cp: any) => 
        cp.staff_id === sId || cp.staff_id === null || cp.staff_id === undefined
      )

      const staffSlots = generateSlots({
        date: requestedDate,
        durationMinutes: service.duration_minutes,
        availability: resolvedAvailability,
        existingBookings: staffBookings as any[],
        closedPeriods: staffClosed as any[],
        timezone: business.timezone,
        slotIntervalMinutes: 30,
      })

      // Agregamos: Se num determinado horário este barbeiro estiver livre, o horário fica disponível publicamente.
      for (const slot of staffSlots) {
        if (!aggregatedSlots[slot.start]) aggregatedSlots[slot.start] = false
        if (slot.available) aggregatedSlots[slot.start] = true
      }
    }

    // Transformar de volta em array e ordenar
    const slots = Object.keys(aggregatedSlots).sort().map(start => {
      const end = new Date(new Date(start).getTime() + service.duration_minutes * 60000).toISOString()
      return { start, end, available: aggregatedSlots[start] }
    })

    return NextResponse.json({ slots })
  } catch (e: any) {
    console.error('[SLOTS API ERROR]', e)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}