import { Check, Scissors, Clock } from 'lucide-react'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string }
}) {
  let amount: string | null = null
  let paid = false

  const sessionId = searchParams.session_id
  if (sessionId) {
    try {
      const stripe = getStripe()
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      paid = session.payment_status === 'paid'
      if (session.amount_total != null) amount = (session.amount_total / 100).toFixed(2)
    } catch {
      /* fall back to generic message */
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-15%] right-[-10%] w-[50vw] h-[50vw] max-w-[400px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[40vw] h-[40vw] max-w-[350px] rounded-full bg-secondary/10 blur-[100px]" />

      <div className="relative z-10 w-full max-w-sm text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-green-500/15 border-2 border-green-500/30 flex items-center justify-center animate-in zoom-in duration-500">
            <Check className="w-9 h-9 text-green-400" strokeWidth={3} />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-1">
          {paid ? 'Pagamento recebido!' : 'Marcação registada!'}
        </h1>
        <p className="text-muted-foreground/70 text-sm mb-6">
          {paid && amount
            ? `Pagaste ${amount}€. A tua marcação está confirmada.`
            : 'A tua marcação está a ser confirmada.'}
        </p>

        <div className="bg-card/50 border border-border/30 rounded-2xl p-5 mb-6 text-left space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <Check size={14} className="text-green-400" />
            </div>
            <p className="text-sm text-foreground">Recebes a confirmação por <strong>SMS</strong> e email.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Clock size={14} className="text-blue-400" />
            </div>
            <p className="text-sm text-foreground">Enviamos um lembrete antes da tua marcação.</p>
          </div>
        </div>

        <a
          href="/"
          className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-semibold bg-card/40 border border-border/40 text-foreground hover:bg-card/60 transition-colors"
        >
          <Scissors size={16} className="text-primary" />
          Concluído
        </a>
      </div>
    </div>
  )
}
