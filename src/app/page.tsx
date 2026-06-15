import Link from 'next/link'
import { Scissors, Calendar, BarChart3, Bell, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: Calendar,
    title: 'Marcações sem telefonemas',
    desc: 'Os clientes marcam pelo telemóvel a qualquer hora. A tua agenda actualiza-se automaticamente.',
  },
  {
    icon: Bell,
    title: 'Lembretes automáticos',
    desc: 'SMS e email antes de cada marcação. Menos faltas, agenda sempre cheia.',
  },
  {
    icon: BarChart3,
    title: 'Painel de gestão completo',
    desc: 'Agenda, equipa, clientes e relatórios de receita — tudo num único ecrã.',
  },
]

const steps = [
  { n: '1', title: 'Cria a tua barbearia', desc: 'Em menos de 2 minutos, sem cartão de crédito.' },
  { n: '2', title: 'Partilha o teu link', desc: 'Instagram, WhatsApp, SMS — os clientes abrem e marcam.' },
  { n: '3', title: 'Gere tudo no painel', desc: 'Vês cada marcação em tempo real, em qualquer dispositivo.' },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* Nav */}
      <nav className="border-b border-border/20 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Scissors size={14} className="text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">BookFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="text-sm text-muted-foreground h-9">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild className="text-sm h-9 rounded-xl font-bold px-5">
              <Link href="/register">Começar</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] max-w-[500px] max-h-[500px] rounded-full bg-primary/8 blur-[160px]" />

        <div className="relative max-w-3xl mx-auto px-5 pt-24 pb-24 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-[3.5rem] font-bold tracking-tight text-foreground mb-5 leading-[1.1]">
            A tua barbearia aceita<br />
            <span className="text-primary">marcações online</span>
          </h1>

          <p className="text-muted-foreground text-lg max-w-md mx-auto mb-10 leading-relaxed">
            Sem telefonemas, sem papel. Os clientes marcam pelo link,
            tu geris tudo no painel.
          </p>

          <Button asChild size="lg" className="h-14 px-10 rounded-2xl font-bold text-base shadow-lg shadow-primary/25">
            <Link href="/register">
              Criar a minha barbearia <ArrowRight size={18} className="ml-2" />
            </Link>
          </Button>

          <p className="text-muted-foreground/40 text-xs mt-5">
            Sem cartão de crédito · Configuração em 2 minutos
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-5 py-16 border-t border-border/20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-card/40 border border-border/30 rounded-2xl p-6">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Icon size={16} className="text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-1 text-sm">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-5 py-16 border-t border-border/20">
        <h2 className="text-center text-xl font-bold mb-12">Como funciona</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
          {steps.map(({ n, title, desc }) => (
            <div key={n} className="text-center">
              <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center font-bold text-primary-foreground mx-auto mb-4 shadow-lg shadow-primary/20">
                {n}
              </div>
              <h3 className="font-bold text-foreground mb-1 text-sm">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="max-w-4xl mx-auto px-5 py-16 border-t border-border/20">
        <div className="bg-card/40 border border-border/30 rounded-3xl p-10 sm:p-14 text-center">
          <h2 className="text-2xl font-bold mb-3">Pronto para começar?</h2>
          <p className="text-muted-foreground text-sm mb-8 max-w-xs mx-auto leading-relaxed">
            Cria a tua barbearia agora. Sem compromisso, cancela quando quiseres.
          </p>
          <Button asChild size="lg" className="h-13 px-10 rounded-2xl font-bold text-base shadow-lg shadow-primary/25">
            <Link href="/register">
              Criar a minha barbearia <ArrowRight size={18} className="ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
            <Scissors size={12} className="text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground text-sm">BookFlow</span>
        </div>
        <div className="flex items-center justify-center gap-4 mb-3">
          <Link href="/politica-de-privacidade" className="text-muted-foreground/40 hover:text-muted-foreground text-xs transition-colors">Privacidade</Link>
          <span className="text-border/40 text-xs">·</span>
          <Link href="/termos" className="text-muted-foreground/40 hover:text-muted-foreground text-xs transition-colors">Termos</Link>
          <span className="text-border/40 text-xs">·</span>
          <Link href="/dpa" className="text-muted-foreground/40 hover:text-muted-foreground text-xs transition-colors">Subcontratante</Link>
        </div>
        <p className="text-muted-foreground/40 text-xs">
          © {new Date().getFullYear()} BookFlow · Feito em Portugal
        </p>
      </footer>
    </div>
  )
}
