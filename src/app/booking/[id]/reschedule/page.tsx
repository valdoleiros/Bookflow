'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { Scissors, CheckCircle, AlertCircle, Loader2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DateTimeSelection } from '@/components/booking/date-time-selection'

export default function ReschedulePage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true)
  const [bookingInfo, setBookingInfo] = useState<any>(null)
  const [notFound, setNotFound] = useState(false)

  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch(`/api/bookings/${params.id}/public`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setNotFound(true) }
        else if (data.status !== 'confirmed') { setNotFound(true) }
        else { setBookingInfo(data) }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [params.id])

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !bookingInfo) return
    setSubmitting(true)

    const dateStr   = format(selectedDate, 'yyyy-MM-dd')
    const startTime = fromZonedTime(`${dateStr}T${selectedTime}:00`, bookingInfo.business.timezone)

    const res  = await fetch(`/api/bookings/${params.id}/reschedule`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ new_start_time: startTime.toISOString() }),
    })
    const data = await res.json()

    if (res.ok) { setStatus('done'); setMessage(data.message) }
    else        { setStatus('error'); setMessage(data.error ?? 'Erro ao reagendar.') }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground/50" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertCircle size={40} className="text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="font-bold text-lg text-foreground mb-2">Marcação não disponível</h1>
          <p className="text-muted-foreground text-sm">Esta marcação não existe ou já não pode ser reagendada.</p>
        </div>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-green-500/15 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-green-400" />
          </div>
          <h1 className="font-bold text-xl text-foreground mb-2">Reagendado!</h1>
          <p className="text-muted-foreground text-sm mb-1">{message}</p>
          <p className="text-muted-foreground/50 text-xs mt-3">Receberás um SMS de confirmação em breve.</p>
        </div>
      </div>
    )
  }

  const { business, service, staff: staffMember } = bookingInfo

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-5 py-5 border-b border-border/20">
        <div className="flex items-center gap-2 mb-1">
          <Scissors size={16} className="text-primary" />
          <span className="font-bold text-foreground">{business.name}</span>
        </div>
        <p className="text-muted-foreground/60 text-xs">Reagendar marcação</p>
      </header>

      <div className="flex-1 px-5 py-4 max-w-lg mx-auto w-full space-y-4">
        {/* Current booking info */}
        <div className="bg-card/40 border border-border/30 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground/50 uppercase tracking-wider mb-2">Marcação actual</p>
          <p className="font-semibold text-foreground text-sm">{service.name}</p>
          <p className="text-muted-foreground text-xs mt-0.5">
            {service.duration_minutes} min{service.price != null ? ` · ${Number(service.price).toFixed(2)}€` : ''}
            {staffMember ? ` · ${staffMember.name}` : ''}
          </p>
        </div>

        {/* New date/time picker */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Calendar size={12} /> Escolhe o novo horário
          </h2>
          <DateTimeSelection
            business={business}
            service={service}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            selectedStaffId={staffMember?.id ?? null}
            onDateSelect={setSelectedDate}
            onTimeSelect={setSelectedTime}
          />
        </div>

        {status === 'error' && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl p-3 flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            {message}
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!selectedDate || !selectedTime || submitting}
          className="w-full h-12 rounded-2xl font-bold"
        >
          {submitting ? <><Loader2 size={16} className="animate-spin mr-2" />A reagendar...</> : 'Confirmar Reagendamento'}
        </Button>
      </div>
    </div>
  )
}
