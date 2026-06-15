# ============================================================
# BookFlow - Reencaminha os webhooks da Stripe para o localhost
# ============================================================
# Corre ISTO num terminal separado ANTES de testar o pagamento
# (deixa-o a correr durante toda a demo):
#
#   powershell -ExecutionPolicy Bypass -File scripts\stripe-listen.ps1
#
# Mantem este terminal aberto. Cada pagamento de teste vai aparecer aqui
# e o estado da subscricao no dashboard passa a "Activa" automaticamente.
# ============================================================

$ErrorActionPreference = "Stop"

# Localiza o stripe.exe (instalado via winget) mesmo que o PATH ainda nao tenha refrescado
$stripe = (Get-Command stripe -ErrorAction SilentlyContinue).Source
if (-not $stripe) {
  $stripe = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter stripe.exe -ErrorAction SilentlyContinue |
            Select-Object -First 1 -ExpandProperty FullName
}
if (-not $stripe) {
  Write-Error "Stripe CLI nao encontrada. Instala com: winget install --id Stripe.StripeCLI"
  exit 1
}

# Le a STRIPE_SECRET_KEY do .env.local (assim fica sempre em sincronia)
$envFile = Join-Path $PSScriptRoot "..\.env.local"
$key = (Get-Content $envFile | Where-Object { $_ -match '^\s*STRIPE_SECRET_KEY\s*=' } |
        Select-Object -First 1) -replace '^\s*STRIPE_SECRET_KEY\s*=\s*', ''
$key = $key.Trim()
if (-not $key) {
  Write-Error "STRIPE_SECRET_KEY nao encontrada no .env.local"
  exit 1
}

Write-Host "A reencaminhar webhooks da Stripe para http://localhost:3000/api/stripe/webhook ..." -ForegroundColor Cyan
Write-Host "(Ctrl+C para parar)`n" -ForegroundColor DarkGray

& $stripe listen --api-key $key --forward-to "localhost:3000/api/stripe/webhook"
