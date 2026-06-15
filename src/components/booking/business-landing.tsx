'use client'

import { useState, type CSSProperties } from 'react'
import { Scissors, MapPin, Phone, Clock, ChevronRight, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BookingFlow } from './booking-flow'
import { brandColorVars } from '@/lib/brand-color'
import clsx from 'clsx'

interface Business {
  id: string; name: string; phone: string | null; slug: string; timezone: string
  address?: string | null; description?: string | null; cover_url?: string | null; logo_url?: string | null
  brand_color?: string | null
  prepayment_mode?: string | null; prepayment_value?: number | null
}
interface Service { id: string; name: string; duration_minutes: number; price: number | null; is_active: boolean }
interface Availability { day_of_week: number; start_hour: string; end_hour: string; is_active: boolean }

const DAY_NAMES_FULL  = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
const DAY_NAMES_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

export function BusinessLanding({
  business, services, staff, availability,
}: {
  business: Business; services: Service[]; staff: any[]; availability: Availability[]
}) {
  const [showBooking, setShowBooking] = useState(false)
  const brandStyle = brandColorVars(business.brand_color) as CSSProperties | undefined

  if (showBooking) {
    return (
      <div style={brandStyle}>
        <BookingFlow business={business} services={services} staff={staff} availability={availability} />
      </div>
    )
  }

  const todayDow = new Date().getDay()
  const todayRule = availability.find(a => a.day_of_week === todayDow)
  const isOpenToday = todayRule?.is_active ?? false

  // Group consecutive days with the same hours for compact display
  const weekRows = [1,2,3,4,5,6,0].map(dow => {
    const rule = availability.find(a => a.day_of_week === dow)
    return {
      label: DAY_NAMES_SHORT[dow],
      hours: rule?.is_active ? `${rule.start_hour.slice(0,5)} – ${rule.end_hour.slice(0,5)}` : 'Fechado',
      active: rule?.is_active ?? false,
    }
  })

  return (
    <div style={brandStyle}>
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Cover ── */}
      <div className="relative h-52 sm:h-64 shrink-0 overflow-hidden"
        style={business.cover_url
          ? { backgroundImage: `url(${business.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : undefined}>
        {!business.cover_url && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-primary/20 to-secondary/30" />
        )}
        {business.cover_url && (
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
        )}

        {/* Business identity */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <div className="flex items-end gap-3">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt={business.name}
                className="w-14 h-14 rounded-2xl object-cover shadow-xl shrink-0 bg-card"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-xl shrink-0">
                <Scissors size={24} className="text-primary-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-foreground leading-tight">{business.name}</h1>
              {business.description && (
                <p className="text-sm text-muted-foreground/80 mt-0.5 line-clamp-1">{business.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 pt-4 pb-28 space-y-5 max-w-lg mx-auto w-full">

        {/* ── Today's status ── */}
        <div className={clsx(
          'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold',
          isOpenToday
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-muted/40 text-muted-foreground border border-border/30'
        )}>
          <span className={clsx('w-2 h-2 rounded-full', isOpenToday ? 'bg-green-400 animate-pulse' : 'bg-muted-foreground/40')} />
          {isOpenToday
            ? `Aberto hoje · ${todayRule!.start_hour.slice(0,5)} – ${todayRule!.end_hour.slice(0,5)}`
            : `Fechado hoje (${DAY_NAMES_FULL[todayDow]})`
          }
        </div>

        {/* ── Info ── */}
        {(business.address || business.phone) && (
          <div className="space-y-2">
            {business.address && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin size={15} className="text-primary/60 shrink-0" />
                <span>{business.address}</span>
              </div>
            )}
            {business.phone && (
              <a href={`tel:${business.phone}`}
                className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Phone size={15} className="text-primary/60 shrink-0" />
                <span>{business.phone}</span>
              </a>
            )}
          </div>
        )}

        {/* ── Services ── */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Serviços</h2>
          <div className="space-y-2">
            {services.map(svc => (
              <div key={svc.id}
                className="flex items-center justify-between bg-card/40 border border-border/30 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Scissors size={13} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{svc.name}</p>
                    <p className="text-xs text-muted-foreground/60">{svc.duration_minutes} min</p>
                  </div>
                </div>
                {svc.price != null && (
                  <span className="font-bold text-primary text-sm">{svc.price.toFixed(2)}€</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Weekly hours ── */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Clock size={12} /> Horário
          </h2>
          <div className="bg-card/40 border border-border/30 rounded-2xl divide-y divide-border/20">
            {weekRows.map(({ label, hours, active }) => (
              <div key={label} className={clsx('flex justify-between px-4 py-2.5 text-sm',
                active ? 'text-foreground' : 'text-muted-foreground/40')}>
                <span className="font-medium">{label}</span>
                <span className={active ? 'text-muted-foreground' : ''}>{hours}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Staff ── */}
        {staff.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Equipa</h2>
            <div className="flex gap-3 flex-wrap">
              {staff.map((s: any) => (
                <div key={s.id} className="flex items-center gap-2 bg-card/40 border border-border/30 rounded-2xl px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                    {s.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-foreground">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/20">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={() => setShowBooking(true)}
            disabled={!isOpenToday && availability.length === 0}
            className="w-full h-14 rounded-2xl font-bold text-base shadow-lg shadow-primary/20 gap-2"
          >
            <Scissors size={18} />
            Marcar Agora
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
    </div>
  )
}
