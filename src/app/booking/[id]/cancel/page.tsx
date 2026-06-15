'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle, CalendarClock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function CancelPage({ params }: { params: { id: string } }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleCancel = async () => {
    setStatus('loading')
    const res  = await fetch(`/api/bookings/${params.id}/public-cancel`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) { setStatus('done');  setMessage(data.message) }
    else        { setStatus('error'); setMessage(data.error ?? 'Erro ao cancelar') }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="max-w-sm w-full rounded-3xl border-border/50 py-0">
        <CardContent className="p-8 text-center">

          {status === 'done' ? (
            <>
              <CheckCircle size={40} className="text-green-500 mx-auto mb-4" />
              <h1 className="font-semibold text-lg text-foreground">Marcação cancelada</h1>
              <p className="text-muted-foreground text-sm mt-2">A sua marcação foi cancelada com sucesso.</p>
            </>

          ) : status === 'error' ? (
            <>
              <AlertCircle size={40} className="text-destructive mx-auto mb-4" />
              <h1 className="font-semibold text-lg text-foreground">Erro</h1>
              <p className="text-muted-foreground text-sm mt-2">{message}</p>
            </>

          ) : (
            <>
              <AlertCircle size={40} className="text-muted-foreground/50 mx-auto mb-4" />
              <h1 className="font-semibold text-lg text-foreground">Cancelar marcação</h1>
              <p className="text-muted-foreground text-sm mt-2 mb-6">
                Tem a certeza que quer cancelar? Esta acção não pode ser desfeita.
              </p>

              {/* Reschedule nudge */}
              <Link
                href={`/booking/${params.id}/reschedule`}
                className="flex items-center gap-2 justify-center w-full bg-primary/10 border border-primary/20 text-primary rounded-2xl py-3 px-4 text-sm font-semibold mb-3 hover:bg-primary/15 transition-colors"
              >
                <CalendarClock size={16} />
                Reagendar em vez disso
              </Link>

              <Button
                onClick={handleCancel}
                disabled={status === 'loading'}
                variant="ghost"
                className="w-full py-3 h-auto rounded-2xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                {status === 'loading' ? 'A cancelar...' : 'Não, quero mesmo cancelar'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
