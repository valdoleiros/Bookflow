'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-6">
        <AlertTriangle size={24} className="text-destructive/70" />
      </div>
      <p className="text-destructive/60 text-sm font-semibold uppercase tracking-widest mb-2">Erro</p>
      <h1 className="text-2xl font-bold text-foreground mb-3">Algo correu mal</h1>
      <p className="text-muted-foreground text-sm mb-8 max-w-xs">
        Ocorreu um erro inesperado. Tenta novamente ou contacta o suporte se o problema persistir.
      </p>
      <Button onClick={reset} className="rounded-xl font-bold px-6">
        Tentar novamente
      </Button>
    </div>
  )
}
