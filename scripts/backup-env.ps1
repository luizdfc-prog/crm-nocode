# backup-env.ps1
# Copia o .env.local para a pasta CRM-Z4P no Google Drive
# Agendado para rodar diariamente pelo Agendador de Tarefas do Windows

$source = "$PSScriptRoot\..\env.local"
$driveFolder = "$env:USERPROFILE\Google Drive\Meu Drive\CRM-Z4P"
$timestamp = Get-Date -Format "yyyy-MM-dd"
$dest = "$driveFolder\.env.local"
$destBackup = "$driveFolder\.env.local.bak.$timestamp"

# Verifica se o Google Drive Desktop está instalado e sincronizado
if (-not (Test-Path $driveFolder)) {
    # Tenta caminho alternativo do Drive
    $driveFolder = "$env:USERPROFILE\Google Drive\CRM-Z4P"
}

if (-not (Test-Path $driveFolder)) {
    Write-Host "AVISO: Pasta do Google Drive nao encontrada em $driveFolder"
    Write-Host "Instale o Google Drive Desktop ou ajuste o caminho neste script."
    exit 1
}

if (-not (Test-Path $source)) {
    Write-Host "AVISO: .env.local nao encontrado em $source"
    exit 1
}

# Mantém backup do dia anterior com timestamp
if (Test-Path $dest) {
    Copy-Item $dest $destBackup -Force
}

# Copia o arquivo atual
Copy-Item $source $dest -Force

Write-Host "Backup concluido: .env.local -> $dest"
Write-Host "Data: $timestamp"
