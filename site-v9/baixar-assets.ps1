# baixar-assets.ps1
# FlowAI Digital — site-v9
#
# Este ambiente de nuvem consegue GERAR as mídias no Higgsfield, mas não
# consegue BAIXÁ-LAS para dentro do projeto (a saída de rede do sandbox
# bloqueia o CDN do Higgsfield). Este script resolve isso: baixa cada
# arquivo listado em src/content/media-manifest.json para public/scenes/,
# rodando no SEU computador, que não tem essa restrição.
#
# Como usar:
#   1. Clique com o botão direito neste arquivo → "Executar com PowerShell"
#      (ou abra um terminal PowerShell na pasta site-v9 e rode: .\baixar-assets.ps1)
#   2. Espere terminar — leva alguns segundos por arquivo.
#   3. Rode "npm run dev" normalmente. O site passa a carregar as mídias
#      localmente, sem depender da conta do Higgsfield estar ativa.
#
# Pode rodar de novo a qualquer momento — arquivos já baixados são pulados,
# a menos que o manifesto tenha um "local" novo.

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$manifestPath = Join-Path $root "src\content\media-manifest.json"
$outDir = Join-Path $root "public\scenes"

if (-not (Test-Path $manifestPath)) {
    Write-Host "Não encontrei $manifestPath. Rode este script de dentro da pasta site-v9." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json

if ($manifest.items.Count -eq 0) {
    Write-Host "O manifesto ainda não tem nenhuma mídia aprovada para baixar." -ForegroundColor Yellow
    exit 0
}

$ok = 0
$fail = 0

foreach ($item in $manifest.items) {
    $dest = Join-Path $outDir $item.local

    if (Test-Path $dest) {
        Write-Host "Já existe: $($item.local) — pulando." -ForegroundColor DarkGray
        continue
    }

    Write-Host "Baixando $($item.id) -> public\scenes\$($item.local) ..." -ForegroundColor Cyan
    try {
        Invoke-WebRequest -Uri $item.url -OutFile $dest -UseBasicParsing
        Write-Host "  OK ($([math]::Round((Get-Item $dest).Length / 1KB, 0)) KB)" -ForegroundColor Green
        $ok++
    }
    catch {
        Write-Host "  FALHOU: $($_.Exception.Message)" -ForegroundColor Red
        $fail++
    }
}

Write-Host ""
Write-Host "Concluído: $ok baixado(s), $fail falha(s)." -ForegroundColor White
if ($fail -gt 0) {
    Write-Host "Se algo falhou, o link pode ter expirado — peça para eu gerar de novo." -ForegroundColor Yellow
}
