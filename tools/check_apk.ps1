$ErrorActionPreference = 'Continue'
$BT = 'D:\Documents\world-clock\tools\sdk\build-tools\34.0.0'
$env:JAVA_HOME = 'D:\Documents\world-clock\tools\jdk\jdk-17.0.21.1+2'
$env:PATH = "$env:JAVA_HOME\bin;$BT;$env:PATH"

foreach ($f in @('WorldClock-zh-v1.0.0.apk', 'WorldClock-Intl-v1.0.0.apk')) {
    $p = "D:\Documents\world-clock\dist\$f"
    Write-Host "===== $f ====="
    & "$BT\aapt.exe" dump badging $p 2>&1 | Select-String "^package:|application-label:|launchable-activity:"
    & "$BT\apksigner.bat" verify $p 2>&1 | Select-Object -First 1

    $tmp = "D:\Documents\world-clock\build\chk-$([System.IO.Path]::GetFileNameWithoutExtension($f))"
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
    Copy-Item $p "$tmp.zip"
    Expand-Archive "$tmp.zip" -DestinationPath $tmp -Force
    $h = Get-Content "$tmp\assets\index.html" -Raw
    if ($h -match "mode: 'now', lang: '(?<l>\w+)'") { Write-Host "  default lang: $($Matches['l'])" }
}
