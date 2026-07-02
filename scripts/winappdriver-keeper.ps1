# Copyright (c) 2026 Ton Jacobs. All rights reserved.
# WinAppDriver Keeper - Houdt WinAppDriver altijd draaiend

param(
    [switch]$Stop,
    [switch]$Status,
    [int]$Port = 4723
)

$WAD_PATHS = @(
    "C:\Program Files (x86)\Windows Application Driver\WinAppDriver.exe",
    "C:\Program Files\Windows Application Driver\WinAppDriver.exe",
    "${env:LOCALAPPDATA}\Programs\Windows Application Driver\WinAppDriver.exe"
)

$WAD_PATH = $null
foreach ($path in $WAD_PATHS) {
    if (Test-Path $path) {
        $WAD_PATH = $path
        break
    }
}

function Get-WADProcess {
    return Get-Process -Name "WinAppDriver" -ErrorAction SilentlyContinue
}

function Test-WADRunning {
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:${Port}/status" -Method GET -TimeoutSec 2
        return $true
    } catch {
        return $false
    }
}

if ($Status) {
    $proc = Get-WADProcess
    $httpOk = Test-WADRunning
    
    if ($proc -and $httpOk) {
        Write-Host "✅ WinAppDriver draait (PID: $($proc.Id), Poort: $Port)" -ForegroundColor Green
        exit 0
    } elseif ($proc) {
        Write-Host "⚠️ WinAppDriver proces draait maar reageert niet op HTTP (PID: $($proc.Id))" -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "❌ WinAppDriver draait niet" -ForegroundColor Red
        exit 1
    }
}

if ($Stop) {
    $proc = Get-WADProcess
    if ($proc) {
        Stop-Process -Name "WinAppDriver" -Force
        Write-Host "🛑 WinAppDriver gestopt" -ForegroundColor Yellow
    } else {
        Write-Host "ℹ️ WinAppDriver was al gestopt" -ForegroundColor Gray
    }
    exit 0
}

# === START / KEEP ALIVE ===

if (-not $WAD_PATH) {
    Write-Host "❌ WinAppDriver niet gevonden!" -ForegroundColor Red
    Write-Host "   Installeer het van: https://github.com/microsoft/WinAppDriver/releases" -ForegroundColor Gray
    exit 1
}

Write-Host "🔧 WinAppDriver Keeper gestart" -ForegroundColor Cyan
Write-Host "   Pad: $WAD_PATH" -ForegroundColor Gray
Write-Host "   Poort: $Port" -ForegroundColor Gray
Write-Host "   Druk CTRL+C om te stoppen..." -ForegroundColor DarkGray
Write-Host ""

# Eerst check of het al draait
$existing = Get-WADProcess
if ($existing) {
    Write-Host "⚠️ WinAppDriver draait al (PID: $($existing.Id)). Stop eerst..." -ForegroundColor Yellow
    Stop-Process -Name "WinAppDriver" -Force
    Start-Sleep -Seconds 1
}

while ($true) {
    try {
        # Start WinAppDriver
        $proc = Start-Process -FilePath $WAD_PATH -ArgumentList $Port -PassThru -WindowStyle Hidden
        Write-Host "🚀 WinAppDriver gestart (PID: $($proc.Id))" -ForegroundColor Green
        
        # Wacht tot het proces stopt (crasht of wordt gestopt)
        $proc.WaitForExit()
        
        Write-Host "⚠️ WinAppDriver is gestopt! Herstarten over 3 seconden..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
        
    } catch {
        Write-Host "❌ Fout bij starten WinAppDriver: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   Herstarten over 5 seconden..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
}
