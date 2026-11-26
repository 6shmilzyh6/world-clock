# ============================================================
# 世界时钟 · Android 构建（aapt2 + javac + d8 + apksigner，无 Gradle）
#   -Variant cn   → 中文版 com.yg.worldclock     「世界时钟」
#   -Variant intl → 国际版 com.yg.worldclock.intl "World Clock"（默认英文）
# 用法: powershell -NoProfile -ExecutionPolicy Bypass -File build_apk.ps1 -Variant intl
# ============================================================
param([string]$Variant = 'cn')

$ErrorActionPreference = 'Continue'
$Root   = 'D:\Documents\world-clock'
$Sdk    = "$Root\tools\sdk"
$Jdk    = "$Root\tools\jdk\jdk-17.0.21.1+2"
$BT     = "$Sdk\build-tools\34.0.0"
$Plat   = "$Sdk\platforms\android-34\android.jar"
$Src    = "$Root\android"
$Work   = "$Root\build\apk-$Variant"
$OutDir = "$Root\dist"

if ($Variant -eq 'intl') {
    $Pkg      = 'com.yg.worldclock.intl'
    $Label    = 'World Clock'
    $Lang     = 'en'
    $ApkName  = 'WorldClock-Intl-v1.0.0.apk'
    $VerName  = '1.0.0'
} else {
    $Pkg      = 'com.yg.worldclock'
    $Label    = '世界时钟'
    $Lang     = 'zh'
    $ApkName  = 'WorldClock-zh-v1.0.0.apk'
    $VerName  = '1.0.0'
}

$env:JAVA_HOME = $Jdk
$env:PATH = "$Jdk\bin;$BT;$Sdk\platform-tools;$env:PATH"

function Fail($msg) { Write-Host "!! $msg" -ForegroundColor Red; exit 1 }

Write-Host "===== 构建 $Variant ($Pkg / $Label) =====" -ForegroundColor Yellow
if (Test-Path $Work) { Remove-Item $Work -Recurse -Force }
New-Item -ItemType Directory -Force -Path `
    "$Work\gen","$Work\classes","$Work\dex","$Work\res-compiled","$Work\assets","$Work\res-src","$OutDir","$Root\keystore" | Out-Null

# ---------- 1. 资源（国际版覆盖 app_name） ----------
Write-Host "== 1. res" -ForegroundColor Cyan
Copy-Item "$Src\res\*" "$Work\res-src" -Recurse -Force
if ($Variant -eq 'intl') {
    @"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">World Clock</string>
</resources>
"@ | Set-Content -Path "$Work\res-src\values\strings.xml" -Encoding UTF8
}

# ---------- 2. 清单（国际版改包名与 Activity 全限定名） ----------
Write-Host "== 2. manifest" -ForegroundColor Cyan
$manifest = Get-Content "$Src\AndroidManifest.xml" -Raw -Encoding UTF8
if ($Variant -eq 'intl') {
    $manifest = $manifest.Replace('package="com.yg.worldclock"', 'package="com.yg.worldclock.intl"')
    $manifest = $manifest.Replace('android:name=".MainActivity"', 'android:name="com.yg.worldclock.MainActivity"')
}
[System.IO.File]::WriteAllText("$Work\AndroidManifest.xml", $manifest, (New-Object System.Text.UTF8Encoding($false)))

# ---------- 3. 前端资源（cn 用国内构建，intl 用国际构建） ----------
Write-Host "== 3. assets" -ForegroundColor Cyan
$htmlPath = if ($Lang -eq 'en') { "$Root\build\worldclock-intl.html" } else { "$Root\build\worldclock.html" }
if (-not (Test-Path $htmlPath)) { Fail "缺少 $htmlPath，先跑 node tools/bundle.js cn`nnode tools/bundle.js intl" }
$html = Get-Content $htmlPath -Raw -Encoding UTF8
[System.IO.File]::WriteAllText("$Work\assets\index.html", $html, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("   assets/index.html " + [math]::Round((Get-Item "$Work\assets\index.html").Length/1KB,1) + " KB  <- " + (Split-Path $htmlPath -Leaf))

# ---------- 4. aapt2 ----------
Write-Host "== 4. aapt2 compile + link" -ForegroundColor Cyan
& "$BT\aapt2.exe" compile --dir "$Work\res-src" -o "$Work\res-compiled\res.zip"
if ($LASTEXITCODE -ne 0) { Fail "aapt2 compile" }

& "$BT\aapt2.exe" link -o "$Work\base.apk" `
    -I $Plat `
    --manifest "$Work\AndroidManifest.xml" `
    -A "$Work\assets" `
    --java "$Work\gen" `
    --min-sdk-version 21 --target-sdk-version 34 `
    --version-code 1 --version-name $VerName `
    "$Work\res-compiled\res.zip"
if ($LASTEXITCODE -ne 0) { Fail "aapt2 link" }
Write-Host "   base.apk ok"

# ---------- 5. javac ----------
Write-Host "== 5. javac" -ForegroundColor Cyan
$JavaFiles = @(Get-ChildItem -Path "$Src\src" -Filter *.java -Recurse | ForEach-Object { $_.FullName })
$RJava = Get-ChildItem -Path "$Work\gen" -Filter R.java -Recurse | Select-Object -First 1
if ($RJava) { $JavaFiles += $RJava.FullName }
$javacArgs = @('-source','8','-target','8','-encoding','UTF-8','-nowarn',
  '-bootclasspath', ($Plat -replace '\\','/'), '-classpath', ($Plat -replace '\\','/'),
  '-d', (($Work + '\classes') -replace '\\','/'))
$JavaFiles | ForEach-Object { $javacArgs += ($_ -replace '\\','/') }
[System.IO.File]::WriteAllLines("$Work\javac.args", $javacArgs, (New-Object System.Text.UTF8Encoding($false)))
& "$Jdk\bin\javac.exe" "@$Work\javac.args" 2>"$Work\javac.err"
if ($LASTEXITCODE -ne 0) { Get-Content "$Work\javac.err" -Encoding UTF8 | Select-Object -Last 20; Fail "javac" }
Write-Host "   classes ok"

# ---------- 6. d8 ----------
Write-Host "== 6. d8" -ForegroundColor Cyan
$ClassFiles = @(Get-ChildItem -Path "$Work\classes" -Filter *.class -Recurse | ForEach-Object { $_.FullName })
$d8Args = @('--release','--min-api','21','--lib',($Plat -replace '\\','/'),'--output',(($Work + '\dex') -replace '\\','/'))
$ClassFiles | ForEach-Object { $d8Args += ($_ -replace '\\','/') }
[System.IO.File]::WriteAllLines("$Work\d8.args", $d8Args, (New-Object System.Text.UTF8Encoding($false)))
Push-Location $Work
& "$BT\d8.bat" "@d8.args" 2>"$Work\d8.err"
$d8exit = $LASTEXITCODE
Pop-Location
if ($d8exit -ne 0) { Get-Content "$Work\d8.err" -Encoding UTF8 | Select-Object -Last 15; Fail "d8" }
if (-not (Test-Path "$Work\dex\classes.dex")) { Fail "classes.dex missing" }
Write-Host "   classes.dex ok"

# ---------- 7. 合并 / 对齐 ----------
Write-Host "== 7. merge + zipalign" -ForegroundColor Cyan
Copy-Item "$Work\base.apk" "$Work\unsigned.apk" -Force
Push-Location "$Work\dex"
& "$Jdk\bin\jar.exe" uf "$Work\unsigned.apk" classes.dex 2>"$Work\jar.err"
$jexit = $LASTEXITCODE
Pop-Location
if ($jexit -ne 0) { Get-Content "$Work\jar.err" | Select-Object -Last 10; Fail "jar merge" }

& "$BT\zipalign.exe" -f -p 4 "$Work\unsigned.apk" "$Work\aligned.apk" 2>"$Work\zal.err"
if ($LASTEXITCODE -ne 0) { Get-Content "$Work\zal.err" | Select-Object -Last 10; Fail "zipalign" }

# ---------- 8. 签名 ----------
Write-Host "== 8. sign" -ForegroundColor Cyan
$Ks = "$Root\keystore\worldclock.keystore"
$KsPass = 'worldclock2026'
if (-not (Test-Path $Ks)) {
    & "$Jdk\bin\keytool.exe" -genkeypair `
        -keystore $Ks -storetype PKCS12 `
        -alias worldclock -keyalg RSA -keysize 2048 -validity 10950 `
        -storepass $KsPass -keypass $KsPass `
        -dname "CN=YG World Clock, OU=YG, O=YG, L=Chengdu, ST=Sichuan, C=CN" 2>"$Work\kt.err"
    if ($LASTEXITCODE -ne 0) { Get-Content "$Work\kt.err" -Encoding UTF8 | Select-Object -Last 10; Fail "keytool" }
    Write-Host "   keystore created"
}
$target = Join-Path $OutDir $ApkName
if (Test-Path $target) { Remove-Item $target -Force }
& "$BT\apksigner.bat" sign `
    --ks $Ks --ks-pass "pass:$KsPass" --key-pass "pass:$KsPass" `
    --ks-key-alias worldclock `
    --min-sdk-version 21 --max-sdk-version 34 `
    --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true `
    --out $target "$Work\aligned.apk" 2>"$Work\as.err"
if ($LASTEXITCODE -ne 0) { Get-Content "$Work\as.err" -Encoding UTF8 | Select-Object -Last 15; Fail "apksigner" }

& "$BT\apksigner.bat" verify $target 2>&1 | Select-Object -First 2
$apk = Get-Item $target
Write-Host ("== DONE: " + $apk.Name + "  " + [math]::Round($apk.Length/1KB,1) + " KB") -ForegroundColor Green
