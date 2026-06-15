"use client"

import { useState, useMemo, useEffect } from "react"
import { format } from "date-fns"
import { fromZonedTime } from "date-fns-tz"
import { ServiceSelection } from "./service-selection"
import { StaffSelection } from "./staff-selection"
import { DateTimeSelection } from "./date-time-selection"
import { CustomerForm } from "./customer-form"
import { ChevronLeft, Check, Scissors, Calendar, Clock, User } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Business {
  id: string; name: string; timezone: string
  prepayment_mode?: string | null; prepayment_value?: number | null
}
interface Service { id: string; name: string; duration_minutes: number; price: number | null }

// Mirrors computePrepaymentCents on the server. Returns euros (0 = no pre-payment).
function prepaymentEuros(business: Business, service: Service | null): number {
  if (!service) return 0
  const mode  = business.prepayment_mode ?? 'off'
  const price = Number(service.price ?? 0)
  const value = Number(business.prepayment_value ?? 0)
  let euros = 0
  if (mode === 'full')                 euros = price
  else if (mode === 'deposit_fixed')   euros = value
  else if (mode === 'deposit_percent') euros = price * (value / 100)
  else return 0
  if (Math.round(euros * 100) < 50) return 0
  return price > 0 ? Math.min(euros, price) : euros
}

export function BookingFlow({ business, services, staff = [], availability = [] }: {
  business: Business; services: Service[]; staff?: any[]
  availability?: { day_of_week: number; is_active: boolean }[]
}) {
  // Se não há staff, saltamos o step 2 (staff selection)
  const hasStaff = staff.length > 0
  const totalSteps = hasStaff ? 4 : 3

  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
  const [staffChosen, setStaffChosen] = useState(false) // track if user clicked
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // On mobile, the on-screen keyboard shrinks the viewport while filling the
  // form. After advancing (or finishing), dismiss the keyboard and scroll to
  // top — otherwise the new screen renders off-screen and looks "stuck".
  useEffect(() => {
    (document.activeElement as HTMLElement | null)?.blur?.()
    window.scrollTo(0, 0)
  }, [step, isComplete])

  // Map logical steps based on whether staff exists
  const getLogicalStep = () => {
    if (!hasStaff) {
      // Without staff: 1=Service, 2=DateTime, 3=Customer
      if (step === 1) return 'service'
      if (step === 2) return 'datetime'
      return 'customer'
    }
    // With staff: 1=Service, 2=Staff, 3=DateTime, 4=Customer
    if (step === 1) return 'service'
    if (step === 2) return 'staff'
    if (step === 3) return 'datetime'
    return 'customer'
  }
  const logicalStep = getLogicalStep()

  const canProceed = () => {
    if (logicalStep === 'service') return selectedService !== null
    if (logicalStep === 'staff') return staffChosen
    if (logicalStep === 'datetime') return selectedDate !== null && selectedTime !== null
    return true
  }

  const handleNext = () => { if (canProceed() && step < totalSteps) setStep(step + 1) }
  const handleBack = () => { if (step > 1) setStep(step - 1) }

  const handleSelectStaff = (id: string | null) => {
    setSelectedStaffId(id)
    setStaffChosen(true)
  }

  const prepayAmount = prepaymentEuros(business, selectedService)

  const handleSubmit = async (data: { name: string; phone: string; email?: string; sms_consent: boolean }) => {
    if (!selectedService || !selectedDate || !selectedTime) return
    setIsSubmitting(true)
    setError(null)

    // Combina data + hora usando timezone do negócio (não do browser!)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const startTime = fromZonedTime(`${dateStr}T${selectedTime}:00`, business.timezone)

    const payload = {
      business_id: business.id,
      service_id: selectedService.id,
      staff_id: selectedStaffId,
      start_time: startTime.toISOString(),
      customer_name: data.name,
      customer_phone: data.phone,
      customer_email: data.email,
      customer_sms_consent: data.sms_consent,
    }

    try {
      // Pre-payment required → redirect to Stripe Checkout (MB WAY / card).
      if (prepayAmount > 0) {
        const res = await fetch('/api/bookings/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json().catch(() => ({}))
        if (res.ok && json.url) {
          window.location.href = json.url
          return // keep the spinner while redirecting
        }
        // Business turned pre-payment off, or it isn't configured → book directly.
        if (!res.ok && json.prepaymentRequired !== false) {
          throw new Error(json.error ?? 'Não foi possível iniciar o pagamento.')
        }
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao criar marcação')
      setIsComplete(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isComplete) {
    const staffName = selectedStaffId
      ? staff.find((s: any) => s.id === selectedStaffId)?.name ?? null
      : null
    const dateLabel = selectedDate?.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-[-15%] right-[-10%] w-[50vw] h-[50vw] max-w-[400px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[40vw] h-[40vw] max-w-[350px] rounded-full bg-secondary/10 blur-[100px]" />

        <div className="relative z-10 w-full max-w-sm">
          {/* Animated check */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-green-500/15 border-2 border-green-500/30 flex items-center justify-center animate-in zoom-in duration-500">
              <Check className="w-9 h-9 text-green-400" strokeWidth={3} />
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-1">Marcação Confirmada!</h2>
            <p className="text-muted-foreground/60 text-sm">{business.name}</p>
          </div>

          {/* Details card */}
          <div className="bg-card/50 border border-border/30 rounded-2xl overflow-hidden mb-5">
            <div className="divide-y divide-border/20">
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Scissors size={14} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground/50 mb-0.5">Serviço</p>
                  <p className="text-sm font-semibold text-foreground">{selectedService?.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 px-5 py-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Calendar size={14} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground/50 mb-0.5">Data</p>
                  <p className="text-sm font-semibold text-foreground capitalize">{dateLabel}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 px-5 py-4">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                  <Clock size={14} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground/50 mb-0.5">Hora</p>
                  <p className="text-2xl font-bold text-foreground font-mono">{selectedTime}</p>
                </div>
              </div>

              {staffName && (
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-sm">
                    {staffName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground/50 mb-0.5">Barbeiro</p>
                    <p className="text-sm font-semibold text-foreground">{staffName}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground/40 mb-5">
            Receberás um SMS de confirmação em breve.
          </p>

          <Button
            onClick={() => {
              setIsComplete(false); setStep(1); setSelectedService(null)
              setSelectedStaffId(null); setStaffChosen(false)
              setSelectedDate(null); setSelectedTime(null); setError(null)
            }}
            variant="outline"
            className="w-full py-4 h-auto rounded-2xl font-semibold bg-card/40 border-border/40"
          >
            Fazer nova marcação
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-6 flex items-center justify-between">
        {step > 1 ? (
          <Button
            onClick={handleBack}
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full bg-card hover:bg-secondary text-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        ) : <div className="w-10" />}
        <div className="flex items-center gap-2">
          <Scissors className="w-6 h-6 text-primary" />
          <span className="text-foreground font-semibold text-lg">{business.name}</span>
        </div>
        <div className="w-10" />
      </header>

      <div className="px-6 mb-6">
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? "w-8 bg-primary" : s < step ? "w-4 bg-primary/50" : "w-4 bg-secondary"}`} />
          ))}
        </div>
      </div>

      <main className="flex-1 px-4 pb-4 overflow-auto">
        <div className="w-full max-w-md md:max-w-xl mx-auto">
          {logicalStep === 'service' && <ServiceSelection services={services} selectedService={selectedService} onSelect={setSelectedService} />}
          {logicalStep === 'staff' && <StaffSelection staff={staff} selectedStaffId={selectedStaffId} onSelect={handleSelectStaff} />}
          {logicalStep === 'datetime' && selectedService && (
            <DateTimeSelection
              business={business}
              service={selectedService}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              selectedStaffId={selectedStaffId}
              availability={availability}
              onDateSelect={setSelectedDate}
              onTimeSelect={setSelectedTime}
            />
          )}
          {logicalStep === 'customer' && <CustomerForm onSubmit={handleSubmit} isSubmitting={isSubmitting} prepayAmount={prepayAmount} />}
          {error && <p className="text-destructive text-sm text-center mt-4">{error}</p>}
        </div>
      </main>

      {step < totalSteps && (
        <footer className="px-4 pb-8 pt-4">
          <div className="w-full max-w-md md:max-w-xl mx-auto">
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="w-full py-4 h-auto rounded-2xl font-semibold text-lg"
            >
              Continuar
            </Button>
          </div>
        </footer>
      )}
    </div>
  )
}