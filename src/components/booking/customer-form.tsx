"use client"

import { useState } from "react"
import { User, Phone, Mail, Loader2, ShieldCheck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function CustomerForm({ onSubmit, isSubmitting, prepayAmount = 0 }: {
  onSubmit: (data: { name: string; phone: string; email?: string; sms_consent: boolean }) => void
  isSubmitting: boolean
  prepayAmount?: number
}) {
  const [name, setName]             = useState('')
  const [phone, setPhone]           = useState('')
  const [email, setEmail]           = useState('')
  const [smsConsent, setSmsConsent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() && phone.trim().length >= 9) {
      onSubmit({ name, phone, email: email.trim() || undefined, sms_consent: smsConsent })
    }
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Os seus dados</h2>
        <p className="text-muted-foreground/60 text-sm mt-2">Para confirmar a marcação</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-3 mb-5">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <Input
              type="text"
              placeholder="Nome completo *"
              value={name}
              autoComplete="name"
              onChange={e => setName(e.target.value)}
              className="w-full bg-card border-border/50 rounded-2xl pl-11 pr-4 py-4 h-auto text-foreground text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/30 focus-visible:border-primary/50"
            />
          </div>

          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="Telemóvel * (ex: 912345678)"
              value={phone}
              autoComplete="tel"
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-card border-border/50 rounded-2xl pl-11 pr-4 py-4 h-auto text-foreground text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/30 focus-visible:border-primary/50"
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <Input
              type="email"
              placeholder="Email (opcional — para receber confirmação)"
              value={email}
              autoComplete="email"
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-card border-border/50 rounded-2xl pl-11 pr-4 py-4 h-auto text-foreground text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/30 focus-visible:border-primary/50"
            />
          </div>
        </div>

        {/* RGPD: informação + opt-in marketing */}
        <div className="bg-card/40 border border-border/30 rounded-2xl p-4 mb-5 space-y-3">
          <p className="text-xs text-muted-foreground/60 leading-relaxed">
            O teu nome e telemóvel são usados exclusivamente para gerir esta marcação e enviar confirmações/lembretes.{' '}
            <Link href="/politica-de-privacidade" target="_blank" className="text-primary/70 hover:underline">
              Política de Privacidade
            </Link>
          </p>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                checked={smsConsent}
                onChange={e => setSmsConsent(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-4 h-4 rounded border border-border/50 bg-card peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center">
                {smsConsent && <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 6l3 3 5-5"/></svg>}
              </div>
            </div>
            <span className="text-xs text-muted-foreground/70 leading-relaxed group-hover:text-muted-foreground transition-colors">
              Aceito receber mensagens de acompanhamento (ex: "Sentimos a tua falta"). Podes cancelar em qualquer altura respondendo STOP.
            </span>
          </label>
        </div>

        {prepayAmount > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck size={15} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Pagamento de {prepayAmount.toFixed(2)}€ para confirmar
              </p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                Pagas por MB WAY ou cartão no passo seguinte. Garante o teu lugar e evita faltas.
              </p>
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || !name.trim() || phone.trim().length < 9}
          className="w-full py-4 h-auto rounded-2xl font-semibold text-lg gap-2"
        >
          {isSubmitting
            ? <><Loader2 className="w-5 h-5 animate-spin" />{prepayAmount > 0 ? 'A ir para pagamento...' : 'A confirmar...'}</>
            : prepayAmount > 0 ? `Pagar ${prepayAmount.toFixed(2)}€ e marcar` : 'Confirmar Marcação'}
        </Button>
      </form>
    </div>
  )
}
