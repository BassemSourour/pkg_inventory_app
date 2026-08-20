<#
    Builds the Packaging Inventory Logger desktop app and installer.

    Run from the project root:

        powershell -ExecutionPolicy Bypass -File tools\build.ps1

    Produces:
        dist\PackagingInventoryLogger\      the application folder
        installer_output\...-Setup-X.Y.Z.exe the installer to hand out
#>

[CmdletBinding()]
param(
    [switch]$SkipInstaller
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$Python = Join-Path $ProjectRoot '.venv\Scripts\python.exe'

if (-not (Test-Path $Python)) {
    throw "Virtual environment not found at $Python. Create it with: python -m venv .venv"
}

# app/config.py is the single source of truth for the version.
$Version = & $Python -c "import sys; sys.path.insert(0,'.'); from app.config import APP_VERSION; print(APP_VERSION)"
$Version = $Version.Trim()

if ([string]::IsNullOrWhiteSpace($Version)) {
    throw 'Could not read APP_VERSION from app/config.py'
}

Write-Host "Building $Version" -ForegroundColor Cyan

Write-Host '[1/3] Generating icon' -ForegroundColor Cyan
& $Python 'tools\make_icon.py'
if ($LASTEXITCODE -ne 0) { throw 'Icon generation failed' }

Write-Host '[2/3] Building executable' -ForegroundColor Cyan
if (Test-Path 'build') { Remove-Item 'build' -Recurse -Force }
if (Test-Path 'dist')  { Remove-Item 'dist'  -Recurse -Force }

& $Python -m PyInstaller 'PackagingInventoryLogger.spec' --noconfirm --log-level WARN
if ($LASTEXITCODE -ne 0) { throw 'PyInstaller build failed' }

$ExePath = 'dist\PackagingInventoryLogger\PackagingInventoryLogger.exe'
if (-not (Test-Path $ExePath)) { throw "Expected executable not found at $ExePath" }

if ($SkipInstaller) {
    Write-Host "Done. Application folder: dist\PackagingInventoryLogger" -ForegroundColor Green
    return
}

Write-Host '[3/3] Compiling installer' -ForegroundColor Cyan

$IsccCandidates = @(
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "$env:ProgramFiles\Inno Setup 6\ISCC.exe"
)

$Iscc = $IsccCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $Iscc) {
    throw "Inno Setup not found. Install it with: winget install --id JRSoftware.InnoSetup -e"
}

& $Iscc "/DAppVersion=$Version" 'installer\PackagingInventoryLogger.iss'
if ($LASTEXITCODE -ne 0) { throw 'Installer compilation failed' }

$Setup = "installer_output\PackagingInventoryLogger-Setup-$Version.exe"

if (Test-Path $Setup) {
    $SizeMb = [math]::Round((Get-Item $Setup).Length / 1MB, 1)
    Write-Host "Done. Installer: $Setup ($SizeMb MB)" -ForegroundColor Green
} else {
    throw "Installer was not produced at $Setup"
}
