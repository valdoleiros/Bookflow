"use client"

import { useState, useEffect } from "react"
import { format, parseISO } from "date-fns"
import { pt } from "date-fns/locale"
import { Loader2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toZonedTime } from "date-fns-tz"

interface Service { id: string; name: string; duration_minutes: number; price: number | null; is_active: boolean }
interface Staff { id: string; name: string; is_active: boolean }
interface TimeSlot { start: string; end: string; available: boolean }

interface ManualBookingDialogProps {
  isOpen: boolean
  onClose: () => void
  businessId: string
  timezone: string
  services: Service[]
  staff?: Staff[]
  onSuccess: () => void
}

export function ManualBookingDialog({ isOpen, onClose, businessId, timezone, services, staff = [], onSuccess }: ManualBookingDialogProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string>("")
  const [selectedStaffId, setSelectedStaffId] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")

  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeServices = services.filter(s => s.is_active)
  const activeStaff = staff.filter(s => s.is_active)

  useEffect(() => {
    if (!isOpen) {
      // Reset form on close
      setSelectedServiceId("")
      setSelectedStaffId(activeStaff.length === 1 ? activeStaff[0].id : "")
      setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
      setSelectedTime(null)
      setCustomerName("")
      setCustomerPhone("")
      setError(null)
      setSlots([])
    }
  }, [isOpen])

  useEffect(() => {
    async function fetchSlots() {
      if (!selectedServiceId || !selectedDate) {
        setSlots([])
        return
      }
      try {
        setLoadingSlots(true)
        const staffQuery = selectedStaffId ? `&staff_id=${selectedStaffId}` : ''
        const res = await fetch(`/api/slots?business_id=${businessId}&service_id=${selectedServiceId}&date=${selectedDate}${staffQuery}`)
        if (!res.ok) throw new Error('Falha a carregar horários')
        const data = await res.json()
        setSlots(data.slots ?? [])
        // Se a hora selecionada já não está disponível, limpamos
        if (selectedTime) {
          const stillAvailable = data.slots.some((s: any) => formatTime(s.start) === selectedTime && s.available)
          if (!stillAvailable) setSelectedTime(null)
        }
      } catch (e) {
        console.error(e)
        setSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }
    fetchSlots()
  }, [selectedServiceId, selectedStaffId, selectedDate, businessId])

  const formatTime = (iso: string) => {
    return format(toZonedTime(parseISO(iso), timezone), 'HH:mm')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedServiceId || !selectedDate || !selectedTime || !customerName.trim() || !customerPhone.trim()) {
      setError("Por favor preencha todos os campos obrigatórios.")
      return
    }
    
    setSubmitting(true)
    setError(null)

    // Build the UTC start_time using business timezone (not browser timezone!)
    const { fromZonedTime } = await import('date-fns-tz')
    const startTime = fromZonedTime(`${selectedDate}T${selectedTime}:00`, timezone)

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          service_id: selectedServiceId,
          staff_id: selectedStaffId || null,
          start_time: startTime.toISOString(),
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao criar marcação')
      
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-background border-border/30 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Adicionar Marcação Manual</DialogTitle>
          <DialogDescription>
            Crie uma marcação para um cliente que ligou ou enviou mensagem.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Serviço *</label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full bg-card/60 border border-border/40 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50"
              required
            >
              <option value="" disabled className="bg-background">Selecione um serviço...</option>
              {activeServices.map(s => (
                <option key={s.id} value={s.id} className="bg-background">{s.name} ({s.duration_minutes} min)</option>
              ))}
            </select>
          </div>

          {activeStaff.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Barbeiro (Opcional)</label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full bg-card/60 border border-border/40 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="" className="bg-background">Qualquer Barbeiro (Livre)</option>
                {activeStaff.map(s => (
                  <option key={s.id} value={s.id} className="bg-background">{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Data *</label>
            <Input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-card/60 border-border/40 rounded-xl text-foreground focus-visible:ring-primary/30 px-4 py-3 h-auto"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Hora *</label>
            {!selectedServiceId ? (
              <p className="text-xs text-muted-foreground/50">Selecione um serviço primeiro.</p>
            ) : loadingSlots ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground/60 py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> A procurar vagas...
              </div>
            ) : slots.length === 0 ? (
              <p className="text-xs text-destructive">Sem vagas disponíveis para este dia.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-2 scrollbar-thin">
                {slots.map(slot => {
                  const t = formatTime(slot.start)
                  const isOccupied = !slot.available
                  return (
                    <Button
                      key={slot.start}
                      type="button"
                      onClick={() => !isOccupied && setSelectedTime(t)}
                      disabled={isOccupied}
                      variant={selectedTime === t ? "default" : "outline"}
                      className={cn(
                        "h-10 rounded-lg text-xs font-semibold",
                        isOccupied ? "bg-card/30 text-muted-foreground/30 line-through opacity-50 cursor-not-allowed border-transparent"
                        : selectedTime === t ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                        : "bg-card border-border/50 text-foreground hover:border-primary/40 hover:bg-card/80"
                      )}
                    >
                      {t}
                    </Button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-sm font-semibold">Nome do Cliente *</label>
            <Input 
              type="text" 
              placeholder="Ex: João Silva" 
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="bg-card/60 border-border/40 rounded-xl text-foreground focus-visible:ring-primary/30 px-4 py-3 h-auto"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Telemóvel *</label>
            <Input
              type="tel"
              placeholder="Ex: 912345678"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="bg-card/60 border-border/40 rounded-xl text-foreground focus-visible:ring-primary/30 px-4 py-3 h-auto"
              required
            />
          </div>

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}

          <div className="pt-4 flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1 rounded-xl">Cancelar</Button>
            <Button type="submit" disabled={submitting || !selectedTime || !selectedServiceId || !customerName.trim() || !customerPhone.trim()} className="flex-1 rounded-xl font-bold">
              {submitting ? 'A guardar...' : 'Confirmar Reserva'}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  )
}
