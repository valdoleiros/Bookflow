# BookFlow — Deploy de DEMO (custo 0€)

Objetivo: pôr o BookFlow num URL público para mostrar a um cliente, **sem pagar nada**.
Tudo aqui usa free tiers / modo de teste. Só passas a *live* (e a pagar por uso) quando vendes.

> Faz os passos **por ordem**. Os comandos marcados com 👉 são logins/contas que **tens de correr tu**
> (abrem o browser). Na linha de comandos do Claude Code podes corrê-los escrevendo `! <comando>`.

---

## 0. Contas gratuitas a criar (5 min)
- **Vercel** → https://vercel.com/signup (plano Hobby, grátis)
- **Supabase** → https://supabase.com/dashboard (free tier)
- **Twilio** → https://www.twilio.com/try-twilio (trial com ~€15 de crédito grátis)
- **Resend** *(opcional, email)* → https://resend.com (free tier 3000/mês)
- **Stripe** → já tens conta em modo teste (não precisa de mais nada para a demo)

Guarda as credenciais à medida que avanças — vais precisar delas no passo 3.

---

## 1. Supabase (base de dados na cloud)

### 1a. Criar projeto novo
No dashboard Supabase → **New project**. Região: **West EU (London)** ou **Frankfurt**.
Define uma password forte para a DB (guarda-a). Espera ~2 min até ficar pronto.

### 1b. Aplicar as migrações (schema) — CLI
```
👉 ! supabase login
supabase link --project-ref <REF_DO_TEU_PROJETO_NOVO>
supabase db push
```
> O `<REF>` está no URL do dashboard (`app.supabase.com/project/<REF>`) ou em Settings → General.
> `db push` aplica as 7 migrações em `supabase/migrations/`.

### 1c. Copiar as chaves
Settings → **API**:
- `Project URL`            → vai ser `NEXT_PUBLIC_SUPABASE_URL`
- `anon public`           → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` (secret) → `SUPABASE_SERVICE_ROLE_KEY`

### 1d. Auth — desligar confirmação de email (para a demo correr fluida)
Authentication → **Sign In / Providers** → Email → desliga **"Confirm email"**.
(Assim, ao registar uma barbearia na demo, entras logo sem ter de clicar num link.)

### 1e. URLs de redirect (preenche depois de teres o URL da Vercel — passo 3)
Authentication → **URL Configuration**:
- Site URL: `https://<o-teu-projeto>.vercel.app`
- Redirect URLs: adiciona `https://<o-teu-projeto>.vercel.app/**`

---

## 2. Twilio (SMS real no telemóvel)

1. Confirma o teu próprio número no signup (recebes um código).
2. Console Twilio → **Get a trial number** (aceita o número que ele sugere).
3. **Verifica o número que vai RECEBER o SMS na demo** (o trial só envia para números verificados):
   Console → Phone Numbers → **Verified Caller IDs** → Add → mete o teu telemóvel (ou o do cliente, na hora).
4. Copia do dashboard inicial:
   - `Account SID` → `TWILIO_ACCOUNT_SID`
   - `Auth Token`  → `TWILIO_AUTH_TOKEN`
   - O número trial (formato `+1...` ou `+351...`) → `TWILIO_PHONE_NUMBER`

> Nota: o trial prefixa as mensagens com *"Sent from a Twilio trial account"*. É normal e desaparece quando compras um número. Para a demo não faz mal.

---

## 3. Deploy na Vercel

A Vercel CLI já está instalada. A partir da pasta do projeto:

```
👉 ! vercel login
vercel link        (cria/associa o projeto — aceita os defaults)
```

### 3a. Definir as variáveis de ambiente (production)
Corre uma a uma — cada `vercel env add <NOME> production` pede o valor e tu colas:

```
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_APP_URL production          → https://<o-teu-projeto>.vercel.app
vercel env add CRON_SECRET production                  → (ver valor abaixo)
vercel env add STRIPE_SECRET_KEY production            → sk_test_... (o teu de teste)
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production  → pk_test_...
vercel env add STRIPE_PRICE_ID production              → price_... (o teu de teste, 19€/mês)
vercel env add STRIPE_WEBHOOK_SECRET production        → whsec_... (do passo 4, faz depois)
vercel env add TWILIO_ACCOUNT_SID production
vercel env add TWILIO_AUTH_TOKEN production
vercel env add TWILIO_PHONE_NUMBER production
vercel env add RESEND_API_KEY production               → (opcional; se não tiveres, o email fica em mock)
vercel env add FROM_EMAIL production                   → onboarding@resend.dev (default de teste do Resend)
```

**CRON_SECRET (forte, gerado para ti):**
```
NiByHQ3xg8B9cZWzNVFI9RS9B7+i9MhGBH0VcyIyLVk=
```

### 3b. Primeiro deploy
```
vercel --prod
```
Anota o URL final (ex: `https://bookflow-xyz.vercel.app`).
Volta atrás e preenche:
- Passo **1e** (URLs no Supabase) com este URL
- `NEXT_PUBLIC_APP_URL` se ainda não meteste o URL certo (`vercel env rm` + `add`, depois redeploy)

---

## 4. Stripe — webhook do site deployed (modo teste, 0€)

> Continua em **modo teste** — não precisas de ativar a conta nem dar dados de negócio para a demo.

Dashboard Stripe (canto: **Test mode** ON) → Developers → **Webhooks** → **Add endpoint**:
- Endpoint URL: `https://<o-teu-projeto>.vercel.app/api/stripe/webhook`
- Eventos: `checkout.session.completed`
- Cria → copia o **Signing secret** (`whsec_...`) → mete em `STRIPE_WEBHOOK_SECRET` (passo 3a)
- Faz novo `vercel --prod` para aplicar a variável.

Assim, na demo, tanto a **subscrição** (barbearia paga 19€/mês) como o **pré-pagamento do cliente** (sinal/MB WAY) funcionam com cartões de teste, sem `stripe listen` a correr.

---

## 5. Smoke test (antes de mostrar ao cliente)

No URL público:
1. **Registar barbearia** → `/register` (entra direto se desligaste confirmação no 1d). Cria serviços, equipa, horários.
2. **Página pública** → abre `https://.../<slug-da-barbearia>` no **telemóvel**. Faz uma marcação real.
3. **SMS** → confirma que o SMS de confirmação chega ao número **verificado** no Twilio. 🎯 (este é o momento-wow)
4. **Pré-pagamento** *(opcional)* → Definições → ativa sinal 30% → nova marcação → Stripe Checkout → cartão `4242 4242 4242 4242`, validade futura, CVC qualquer → marcação aparece na agenda só após pagar.
5. **Subscrição** → Definições → Activar → cartão `4242…` → estado passa a `active`.

### Lembretes 24h/2h numa demo (cron grátis = 1x/dia)
O free tier da Vercel só corre crons 1x/dia, por isso os lembretes não disparam sozinhos na hora.
Para os demonstrares à vontade, dispara-os à mão:
```
curl -H "Authorization: Bearer NiByHQ3xg8B9cZWzNVFI9RS9B7+i9MhGBH0VcyIyLVk=" https://<o-teu-projeto>.vercel.app/api/cron/reminders
```
(O SMS de **confirmação** é imediato e não depende disto — funciona sempre.)

---

## Quando venderes ao primeiro cliente (passar a "a sério")
- Stripe: ativar conta (dados do negócio) → trocar `sk_test/pk_test/price_/whsec_` por `live`.
- Twilio: comprar número PT ou Messaging Service (sai do trial → SMS sem prefixo, para qualquer número).
- Vercel: plano Pro **só** se precisares de crons mais frequentes que 1x/dia (lembretes automáticos).
- Domínio próprio (ex: bookflow.pt) na Vercel → atualizar `NEXT_PUBLIC_APP_URL` e URLs do Supabase.
