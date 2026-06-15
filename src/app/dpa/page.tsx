import Link from 'next/link'
import { Scissors } from 'lucide-react'

export default function DpaPage() {
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

        <h1 className="text-2xl font-bold text-foreground mb-2">Contrato de Subcontratante</h1>
        <p className="text-sm text-muted-foreground/70 mb-1">
          <em>Data Processing Agreement</em> (DPA) — nos termos do Art. 28.º do RGPD
        </p>
        <p className="text-muted-foreground/60 text-sm mb-10">Última actualização: Junho 2026</p>

        <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">1. Partes e âmbito</h2>
            <p className="mb-2">
              Este Contrato de Subcontratante ("DPA") é celebrado entre:
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li><strong className="text-foreground">Responsável pelo tratamento:</strong> a Barbearia subscritora da plataforma BookFlow ("Cliente")</li>
              <li><strong className="text-foreground">Subcontratante:</strong> BookFlow ("BookFlow"), fornecedor da plataforma SaaS de marcações</li>
            </ul>
            <p>
              Este DPA é parte integrante dos <Link href="/termos" className="text-primary/70 hover:underline">Termos de Serviço</Link> e entra em vigor na data de aceitação dos mesmos.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">2. Definições</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">RGPD:</strong> Regulamento (UE) 2016/679 do Parlamento Europeu e do Conselho.</li>
              <li><strong className="text-foreground">Dados Pessoais:</strong> qualquer informação relativa a pessoa singular identificada ou identificável (nome, telemóvel, email, histórico de marcações dos clientes da Barbearia).</li>
              <li><strong className="text-foreground">Tratamento:</strong> qualquer operação sobre Dados Pessoais, incluindo recolha, armazenamento, consulta e eliminação.</li>
              <li><strong className="text-foreground">Subcontratante subsequente:</strong> terceiro subcontratado pela BookFlow para auxiliar no tratamento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">3. Objecto e instrução do tratamento</h2>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2 pr-4 text-foreground font-semibold w-1/3">Categoria</th>
                  <th className="text-left py-2 text-foreground font-semibold">Detalhe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {[
                  ['Finalidade', 'Gerir marcações, enviar confirmações/lembretes por SMS e email, fornecer estatísticas ao painel de controlo da Barbearia'],
                  ['Categorias de dados', 'Nome, número de telemóvel, endereço de email (opcional), histórico de marcações e preferências de comunicação dos clientes da Barbearia'],
                  ['Titulares dos dados', 'Clientes finais (consumidores) que efectuam marcações na Barbearia'],
                  ['Duração do tratamento', 'Enquanto vigorar o contrato de subscrição + 30 dias após rescisão (período de exportação)'],
                  ['Natureza do tratamento', 'Armazenamento em base de dados, envio de comunicações, geração de relatórios, anonimização após inactividade'],
                ].map(([cat, detail]) => (
                  <tr key={cat}>
                    <td className="py-2 pr-4 font-medium text-foreground/80">{cat}</td>
                    <td className="py-2">{detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">4. Obrigações da BookFlow (Subcontratante)</h2>
            <p className="mb-2">A BookFlow compromete-se a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Tratar os Dados Pessoais <strong className="text-foreground">exclusivamente segundo as instruções documentadas</strong> do Cliente e conforme estes Termos, salvo obrigação legal em contrário.</li>
              <li>Assegurar que as pessoas autorizadas a tratar os Dados Pessoais se encontram vinculadas a obrigação de confidencialidade.</li>
              <li>Implementar medidas técnicas e organizativas adequadas (Art. 32.º RGPD): cifra em trânsito (TLS 1.2+), cifra em repouso, Row Level Security na base de dados, controlo de acessos com princípio do mínimo privilégio.</li>
              <li>Notificar o Cliente, <strong className="text-foreground">sem demora injustificada e no prazo máximo de 72 horas</strong> após tomar conhecimento, de qualquer violação de dados pessoais que possa afectar os dados do Cliente.</li>
              <li>Auxiliar o Cliente no cumprimento das obrigações relativas a direitos dos titulares (acesso, rectificação, apagamento, portabilidade, oposição).</li>
              <li>Eliminar ou devolver todos os Dados Pessoais no prazo de <strong className="text-foreground">30 dias</strong> após cessação do contrato, salvo obrigação legal de conservação.</li>
              <li>Disponibilizar ao Cliente toda a informação necessária para demonstrar o cumprimento das obrigações do presente artigo e contribuir para auditorias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">5. Subcontratantes subsequentes autorizados</h2>
            <p className="mb-3">
              O Cliente autoriza a BookFlow a recorrer aos seguintes subcontratantes subsequentes. A BookFlow vincula-os a obrigações equivalentes às deste DPA:
            </p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2 pr-4 text-foreground font-semibold">Entidade</th>
                  <th className="text-left py-2 pr-4 text-foreground font-semibold">Finalidade</th>
                  <th className="text-left py-2 text-foreground font-semibold">Localização</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {[
                  ['Supabase, Inc.', 'Base de dados e autenticação', 'UE (AWS eu-west-1)'],
                  ['Twilio, Inc.', 'Envio de SMS', 'EUA (cláusulas contratuais-tipo UE)'],
                  ['Resend, Inc.', 'Envio de email transaccional', 'EUA (cláusulas contratuais-tipo UE)'],
                  ['Vercel, Inc.', 'Alojamento da aplicação', 'UE (edge) / EUA (cláusulas contratuais-tipo UE)'],
                  ['Stripe, Inc.', 'Processamento de pagamentos (dados de facturação apenas)', 'EUA (cláusulas contratuais-tipo UE)'],
                ].map(([name, purpose, location]) => (
                  <tr key={name}>
                    <td className="py-2 pr-4 font-medium text-foreground/80">{name}</td>
                    <td className="py-2 pr-4">{purpose}</td>
                    <td className="py-2 text-muted-foreground/70">{location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground/60">
              A BookFlow informará o Cliente com <strong className="text-foreground">30 dias de antecedência</strong> de qualquer alteração à lista de subcontratantes. O Cliente pode opor-se fundamentadamente no prazo de 15 dias.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">6. Transferências internacionais</h2>
            <p>
              As transferências de Dados Pessoais para subcontratantes estabelecidos fora do Espaço Económico Europeu (Twilio, Resend, Vercel, Stripe) são efectuadas ao abrigo das <strong className="text-foreground">Cláusulas Contratuais-Tipo</strong> adoptadas pela Comissão Europeia (Decisão 2021/914/UE), garantindo um nível de protecção equivalente ao do RGPD.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">7. Obrigações do Cliente (Responsável pelo tratamento)</h2>
            <p className="mb-2">O Cliente, enquanto Responsável pelo tratamento, compromete-se a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Assegurar que dispõe de base legal adequada (consentimento, execução de contrato, ou interesse legítimo) para recolher e utilizar os dados dos seus clientes.</li>
              <li>Informar os seus clientes sobre o tratamento de dados, nomeadamente através de aviso de privacidade no momento da marcação.</li>
              <li>Responder a pedidos de exercício de direitos dos titulares, podendo solicitar à BookFlow auxílio técnico quando necessário.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">8. Segurança</h2>
            <p>
              A BookFlow implementa e mantém as seguintes medidas de segurança (Art. 32.º RGPD):
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Cifra de todas as comunicações em trânsito (TLS 1.2+)</li>
              <li>Cifra de dados em repouso na base de dados</li>
              <li>Row Level Security (RLS) — cada barbearia acede apenas aos seus próprios dados</li>
              <li>Autenticação com tokens de sessão de curta duração (1 hora) e refresh token rotation</li>
              <li>Rate limiting nas APIs públicas</li>
              <li>Segregação de funções: operações administrativas apenas via service role key, nunca exposta ao cliente</li>
              <li>Revisões de segurança periódicas e aplicação de actualizações de dependências</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">9. Violação de dados</h2>
            <p>
              Em caso de violação de segurança que implique risco para os direitos e liberdades dos titulares, a BookFlow notificará o Cliente no prazo máximo de <strong className="text-foreground">72 horas</strong>, com indicação da natureza da violação, categorias e número aproximado de titulares afectados, consequências prováveis e medidas tomadas ou propostas. O Cliente é responsável por notificar a CNPD se assim o exigir o Art. 33.º RGPD.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">10. Lei aplicável</h2>
            <p>
              Este DPA é regido pela lei portuguesa e pelo RGPD. Qualquer litígio será submetido aos tribunais da comarca de Lisboa. Para contacto relativo a este DPA: <a href="mailto:privacidade@bookflow.pt" className="text-primary/70 hover:underline">privacidade@bookflow.pt</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
