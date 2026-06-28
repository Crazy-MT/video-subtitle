# full-pipeline.ps1 — Run the complete video-subtitle pipeline from a single video.
#
# Usage:
#   .\examples\full-pipeline.ps1 -Video <path> -TargetLang <code> [-Style <preset>]
#
# Example:
#   .\examples\full-pipeline.ps1 -Video lecture.mp4 -TargetLang en -Style default
#
# Outputs (under .\output\):
#   <video_stem>.wav              - extracted audio
#   <video_stem>.srt              - original-language SRT (Whisper)
#   <video_stem>.<target_lang>.srt - translated SRT (translate manually first)
#   <video_stem>.dual.mp4         - final video with dual subtitles
#
# Note: PowerShell execution policy may block .ps1 by default. If so, run
# once as Administrator:  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Video,
    [Parameter(Mandatory = $true)][string]$TargetLang,
    [string]$Style = "default"
)

$ErrorActionPreference = "Stop"

$SkillDir = Split-Path -Parent $PSScriptRoot
$Stem = [System.IO.Path]::GetFileNameWithoutExtension($Video)
$OutDir = Join-Path $SkillDir "output"
$null = New-Item -ItemType Directory -Force -Path $OutDir

$WavPath = Join-Path $OutDir "$Stem.wav"
$SrtPath = Join-Path $OutDir "$Stem.srt"
$TransSrtPath = Join-Path $OutDir "$Stem.$TargetLang.srt"
$DualMp4Path = Join-Path $OutDir "$Stem.dual.mp4"
$SingleMp4Path = Join-Path $OutDir "$Stem.subtitled.mp4"

$Python = if ($env:PYTHON_BIN) { $env:PYTHON_BIN } else { "python" }

Write-Host ">> Step 1/3 - Extract audio" -ForegroundColor Cyan
& $Python (Join-Path $SkillDir "scripts\extract_audio.py") $Video --output $WavPath

Write-Host ">> Step 2/3 - Transcribe (Whisper base)" -ForegroundColor Cyan
& $Python (Join-Path $SkillDir "scripts\transcribe.py") $WavPath --model base --output $SrtPath

Write-Host ">> Step 3/3 - Burn" -ForegroundColor Cyan
if (Test-Path $TransSrtPath) {
    & $Python (Join-Path $SkillDir "scripts\burn_dual_subtitle.py") `
        $Video $SrtPath $TransSrtPath --output $DualMp4Path
    Write-Host ">> Dual subtitle video: $DualMp4Path" -ForegroundColor Green
} else {
    Write-Host "!! Translated SRT not found at $TransSrtPath" -ForegroundColor Yellow
    Write-Host "   Translate $SrtPath first (manually or with your AI agent)," -ForegroundColor Yellow
    Write-Host "   then re-run. For now, burning single-language subtitle..." -ForegroundColor Yellow
    & $Python (Join-Path $SkillDir "scripts\burn_subtitle.py") `
        $Video $SrtPath --output $SingleMp4Path --style $Style
    Write-Host ">> Single subtitle video: $SingleMp4Path" -ForegroundColor Green
}

Write-Host "Done." -ForegroundColor Green
