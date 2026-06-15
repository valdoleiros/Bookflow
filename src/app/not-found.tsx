import Link from 'next/link'
import { Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] max-w-[500px] rounded-full bg-primary/8 blur-[120px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[40vw] h-[40vw] max-w-[400px] rounded-full bg-secondary/10 blur-[100px]" />

      <div className="relative z-10">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
          <Scissors size={28} className="text-primary/60" />
        </div>

        <p className="text-primary/60 text-sm font-semibold uppercase tracking-widest mb-2">404</p>
        <h1 className="text-3xl font-bold text-foreground mb-3">Página não encontrada</h1>
        <p className="text-muted-foreground text-sm mb-8 max-w-xs">
          A página que procuras não existe ou foi movida.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="rounded-xl font-bold px-6">
            <Link href="/">Ir para o início</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl px-6 bg-card/40 border-border/40">
            <Link href="/login">Entrar na conta</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
