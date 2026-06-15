import Link from 'next/link'
import { Scissors } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 py-12">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Scissors size={14} className="text-primary-foreground" />
          </div>
          <Link href="/" className="font-bold text-foreground hover:text-primary transition-colors">
            BookFlow
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">Política de Privacidade</h1>
        <p className="text-muted-foreground/60 text-sm mb-10">Última actualização: Junho 2026</p>

        <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">1. Responsável pelo tratamento</h2>
            <p>
              Quando efectua uma marcação através de um link BookFlow, o responsável pelo tratamento dos seus dados pessoais é a <strong className="text-foreground">barbearia em questão</strong> (doravante "a Barbearia"). A BookFlow actua como subcontratante, fornecendo a plataforma tecnológica utilizada pela Barbearia.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">2. Dados recolhidos</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nome completo</li>
              <li>Número de telemóvel</li>
              <li>Endereço de email (opcional)</li>
              <li>Histórico de marcações (serviço, data, hora)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">3. Finalidade e base legal</h2>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2 pr-4 text-foreground font-semibold">Finalidade</th>
                  <th className="text-left py-2 text-foreground font-semibold">Base legal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {[
                  ['Gerir e confirmar a sua marcação', 'Execução de contrato (Art. 6.º n.º 1 b) RGPD)'],
                  ['Enviar SMS/email de confirmação e lembretes', 'Execução de contrato'],
                  ['Enviar mensagens de reactivação ("Sentimos a tua falta")', 'Consentimento (Art. 6.º n.º 1 a) RGPD) — opt-in no formulário'],
                ].map(([fin, base]) => (
                  <tr key={fin}>
                    <td className="py-2 pr-4">{fin}</td>
                    <td className="py-2 text-muted-foreground/70">{base}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">4. Conservação dos dados</h2>
            <p>Os seus dados são conservados enquanto mantiver marcações activas ou historial com a Barbearia. Após dois anos de inactividade, os dados pessoais (nome, telemóvel, email) são eliminados automaticamente, mantendo-se apenas estatísticas anónimas.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">5. Os seus direitos (RGPD)</h2>
            <p className="mb-3">Tem direito a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Acesso</strong> — saber que dados guardamos sobre si</li>
              <li><strong className="text-foreground">Rectificação</strong> — corrigir dados incorrectos</li>
              <li><strong className="text-foreground">Apagamento</strong> — solicitar a eliminação dos seus dados</li>
              <li><strong className="text-foreground">Oposição</strong> — opor-se ao tratamento para marketing (responda STOP a qualquer SMS)</li>
              <li><strong className="text-foreground">Portabilidade</strong> — receber os seus dados em formato legível por máquina</li>
            </ul>
            <p className="mt-3">Para exercer qualquer direito, contacte directamente a Barbearia que utilizou ou envie email para <a href="mailto:privacidade@bookflow.pt" className="text-primary/70 hover:underline">privacidade@bookflow.pt</a>.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">6. Partilha de dados</h2>
            <p>Os seus dados <strong className="text-foreground">nunca são vendidos</strong> a terceiros. São partilhados apenas com:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Twilio (envio de SMS) — <a href="https://www.twilio.com/legal/privacy" target="_blank" className="text-primary/70 hover:underline">política Twilio</a></li>
              <li>Resend (envio de email) — <a href="https://resend.com/privacy" target="_blank" className="text-primary/70 hover:underline">política Resend</a></li>
              <li>Supabase (base de dados, UE) — <a href="https://supabase.com/privacy" target="_blank" className="text-primary/70 hover:underline">política Supabase</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">7. Reclamações</h2>
            <p>Tem o direito de apresentar reclamação à <a href="https://www.cnpd.pt" target="_blank" className="text-primary/70 hover:underline">Comissão Nacional de Protecção de Dados (CNPD)</a>, autoridade supervisora portuguesa.</p>
          </section>

        </div>
      </div>
    </div>
  )
}
