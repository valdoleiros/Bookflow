import Link from 'next/link'
import { Scissors } from 'lucide-react'

export default function TermsPage() {
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

        <h1 className="text-2xl font-bold text-foreground mb-2">Termos de Serviço e Contrato de Subscrição</h1>
        <p className="text-muted-foreground/60 text-sm mb-10">Última actualização: Junho 2026</p>

        <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">1. Partes e objecto</h2>
            <p>
              Estes Termos de Serviço ("Termos") constituem um contrato vinculativo entre a <strong className="text-foreground">BookFlow</strong> ("BookFlow", "nós") e a entidade que aceita estes Termos ("Cliente" ou "Barbearia") ao registar uma conta na plataforma BookFlow.
            </p>
            <p className="mt-2">
              A BookFlow fornece uma plataforma SaaS de gestão de marcações e comunicação com clientes para barbearias e estabelecimentos similares, acessível em <strong className="text-foreground">bookflow.pt</strong> ("Plataforma").
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">2. Aceitação dos Termos</h2>
            <p>
              Ao criar uma conta, o Cliente declara ter capacidade legal para contratar em nome da Barbearia e aceitar estes Termos. Se o Cliente não concordar com algum ponto, deverá abster-se de utilizar a Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">3. Serviços prestados</h2>
            <p className="mb-2">A subscrição BookFlow inclui:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Página pública da barbearia com booking online</li>
              <li>Dashboard de gestão (agenda, clientes, serviços, equipa, horários)</li>
              <li>Confirmações e lembretes automáticos por SMS e email</li>
              <li>Relatórios de receita, retenção e taxa de faltas</li>
              <li>Exportação de dados de clientes (CSV)</li>
              <li>Actualizações e melhorias contínuas da Plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">4. Período experimental e subscrição</h2>
            <p>
              Cada nova conta beneficia de um <strong className="text-foreground">período experimental gratuito de 14 dias</strong>, sem necessidade de cartão de crédito. Findo o período experimental, é necessária uma subscrição paga para continuar a utilizar a Plataforma.
            </p>
            <p className="mt-2">
              Os planos e preços vigentes são disponibilizados mediante contacto com a BookFlow. A BookFlow reserva o direito de alterar preços com um aviso prévio de <strong className="text-foreground">30 dias</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">5. Facturação e pagamento</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>A facturação é mensal ou anual, conforme o plano escolhido.</li>
              <li>Os pagamentos são processados pela <strong className="text-foreground">Stripe</strong>, entidade certificada PCI-DSS. A BookFlow não armazena dados de cartão de crédito.</li>
              <li>Em caso de pagamento falhado, a conta é suspensa após 7 dias sem regularização.</li>
              <li>Não são emitidos reembolsos por períodos parciais, excepto quando exigido por lei aplicável.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">6. Obrigações do Cliente</h2>
            <p className="mb-2">O Cliente compromete-se a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Fornecer informações verdadeiras e mantê-las actualizadas.</li>
              <li>Não partilhar credenciais de acesso com terceiros não autorizados.</li>
              <li>Utilizar a Plataforma em conformidade com a lei aplicável, incluindo o RGPD.</li>
              <li>Obter o consentimento adequado dos seus clientes antes de enviar comunicações de marketing por SMS ou email.</li>
              <li>Não utilizar a Plataforma para enviar comunicações não solicitadas (spam).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">7. Disponibilidade e suporte</h2>
            <p>
              A BookFlow compromete-se a disponibilizar a Plataforma com uma <strong className="text-foreground">disponibilidade-alvo de 99,5%</strong> mensal, excluindo manutenção programada e situações de força maior. O suporte é prestado por email em <a href="mailto:suporte@bookflow.pt" className="text-primary/70 hover:underline">suporte@bookflow.pt</a> com resposta em até 2 dias úteis.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">8. Propriedade intelectual</h2>
            <p>
              A Plataforma, o software, o design e toda a documentação são propriedade exclusiva da BookFlow. A subscrição confere ao Cliente uma licença de utilização não exclusiva, não transferível e revogável. Os dados introduzidos pelo Cliente (informações da barbearia, clientes, marcações) pertencem ao Cliente.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">9. Limitação de responsabilidade</h2>
            <p>
              A BookFlow não é responsável por perdas indirectas, lucros cessantes ou danos consequentes resultantes do uso ou incapacidade de usar a Plataforma. A responsabilidade total da BookFlow perante o Cliente, em qualquer caso, não excederá o valor pago pelo Cliente nos últimos <strong className="text-foreground">3 meses</strong> de subscrição.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">10. Rescisão</h2>
            <p>
              Qualquer das partes pode rescindir o contrato com <strong className="text-foreground">30 dias de aviso prévio</strong>. A BookFlow pode rescindir imediatamente em caso de violação grave destes Termos. Após a rescisão, o Cliente pode exportar os seus dados num prazo de 30 dias; findo esse prazo, os dados serão eliminados.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">11. Tratamento de dados pessoais</h2>
            <p>
              O tratamento de dados pessoais efectuado pela BookFlow em nome do Cliente rege-se pelo <Link href="/dpa" className="text-primary/70 hover:underline">Contrato de Subcontratante (DPA)</Link>, parte integrante destes Termos. Para informação sobre os dados dos utilizadores finais (clientes da barbearia), consulte a <Link href="/politica-de-privacidade" className="text-primary/70 hover:underline">Política de Privacidade</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">12. Alterações aos Termos</h2>
            <p>
              A BookFlow pode actualizar estes Termos, notificando o Cliente por email com <strong className="text-foreground">30 dias de antecedência</strong>. A continuação do uso da Plataforma após esse prazo constitui aceitação dos novos Termos.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">13. Lei aplicável e foro</h2>
            <p>
              Estes Termos são regidos pela lei portuguesa. Qualquer litígio será submetido aos tribunais da comarca de Lisboa, com renúncia expressa a qualquer outro foro.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">14. Contacto</h2>
            <p>
              Para questões contratuais ou de facturação: <a href="mailto:geral@bookflow.pt" className="text-primary/70 hover:underline">geral@bookflow.pt</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
