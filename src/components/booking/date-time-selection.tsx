"use client"

import { useState, useEffect } from "react"
import { format, addDays, startOfDay, isSameDay } from "date-fns"
import { pt } from "date-fns/locale"
import { toZonedTime } from "date-fns-tz"
import { Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TimeSlot { start: string; end: string; available: boolean }
interface Business { id: string; timezone: string }
interface Service { id: string; duration_minutes: number }

export function DateTimeSelection({ business, service, selectedDate, selectedTime, selectedStaffId, availability, onDateSelect, onTimeSelect }: {
  business: Business
  service: Service
  selectedDate: Date | null
  selectedTime: string | null
  selectedStaffId: string | null
  availability?: { day_of_week: number; is_active: boolean }[]
  onDateSelect: (d: Date) => void
  onTimeSelect: (t: string) => void
}) {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const days = Array.from({ length: 14 }, (_, i) => addDays(startOfDay(new Date()), i))

  // Auto-select the first day that has an active availability rule.
  // Falls back to today if no availability data is provided.
  const firstOpenDay = availability?.length
    ? days.find(d => {
        const rule = availability.find(a => a.day_of_week === d.getDay())
        return rule?.is_active ?? false
      }) ?? days[0]
    : days[0]

  const active = selectedDate ?? firstOpenDay

  useEffect(() => {
    if (!selectedDate) onDateSelect(firstOpenDay)
  }, [])

  useEffect(() => {
    async function fetchSlots() {
      try {
        setLoading(true)
        const d = format(active, 'yyyy-MM-dd')
        const staffParam = selectedStaffId ? `&staff_id=${selectedStaffId}` : ''
        const res = await fetch(`/api/slots?business_id=${business.id}&service_id=${service.id}&date=${d}${staffParam}`)
        if (!res.ok) throw new Error('Falha na API')
        const data = await res.json()
        setSlots(data.slots ?? [])
      } catch (e) {
        console.error('Erro ao procurar horários:', e)
        setSlots([])
      } finally {
        setLoading(false)
      }
    }
    fetchSlots()
  }, [active, business.id, service.id, selectedStaffId])

  // Remover filtro de available para mostrar as vagas bloqueadas

  const formatTime = (iso: string) => {
    const d = toZonedTime(new Date(iso), business.timezone)
    return format(d, 'HH:mm')
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Escolha a data</h2>
        <p className="text-muted-foreground/60 text-sm mt-2">Próximos 14 dias disponíveis</p>
      </div>

      {/* Date strip */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {days.map(day => {
          const isSelected = isSameDay(day, active)
          const isToday = isSameDay(day, new Date())
          return (
            <Button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-2xl p-0 gap-0",
                isSelected
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-card border-border/50 text-foreground hover:border-primary/40"
              )}
            >
              <span className={cn(
                "text-[10px] font-bold",
                isSelected ? "text-primary-foreground/60" : "text-muted-foreground"
              )}>
                {format(day, 'EEE', { locale: pt }).toUpperCase()}
              </span>
              <span className="text-xl font-bold leading-tight">
                {format(day, 'd')}
              </span>
              {isToday && (
                <span className={cn(
                  "text-[9px] font-bold",
                  isSelected ? "text-primary-foreground/50" : "text-primary"
                )}>HOJE</span>
              )}
            </Button>
          )
        })}
      </div>

      {/* Time slots */}
      <div>
        <p className="text-muted-foreground text-sm mb-3">{format(active, "d 'de' MMMM", { locale: pt })}</p>
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground/50">
            <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">A carregar...</span>
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground/50 text-sm">Sem horários para este dia. Tente outro dia.</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {slots.map(slot => {
              const t = formatTime(slot.start)
              const isOccupied = !slot.available
              return (
                <Button
                  key={slot.start}
                  onClick={() => !isOccupied && onTimeSelect(t)}
                  disabled={isOccupied}
                  variant={selectedTime === t ? "default" : "outline"}
                  className={cn(
                    "h-12 rounded-xl text-sm font-semibold transition-all relative overflow-hidden",
                    isOccupied
                      ? "bg-card/30 text-muted-foreground/30 border-border/20 cursor-not-allowed opacity-50"
                      : selectedTime === t
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
                        : "bg-card border-border/50 text-foreground hover:border-primary/40 hover:bg-card/80"
                  )}
                >
                  <span className={isOccupied ? "line-through" : ""}>{t}</span>
                  {isOccupied && <X className="absolute inset-0 m-auto w-5 h-5 text-muted-foreground/40 stroke-[3]" />}
                </Button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}