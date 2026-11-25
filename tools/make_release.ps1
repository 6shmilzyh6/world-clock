$ErrorActionPreference = 'Stop'
$env:PATH = "D:\新建文件夹\Git\cmd;D:\新建文件夹\Git\mingw64\bin;" + $env:PATH
$env:GIT_TERMINAL_PROMPT = '0'

$Root = 'D:\Documents\world-clock'
$tok = (("protocol=https`nhost=github.com`n`n" | git credential fill) | Where-Object { $_ -match '^password=' }) -replace '^password=', ''
$tok = $tok.Trim()
$h = @{ Authorization = "token $tok"; 'User-Agent' = 'yg-dsh'; Accept = 'application/vnd.github+json' }
$REPO = '6shmilzyh6/world-clock'

# ---------- 1. 生成 SHA256SUMS ----------
$sums = @()
foreach ($n in @('WorldClock-zh-v1.0.0.apk', 'WorldClock-Intl-v1.0.0.apk', 'WorldClock-single.html')) {
    $p = Join-Path $Root "dist\$n"
    $hash = (Get-FileHash $p -Algorithm SHA256).Hash.ToLower()
    $sums += "$hash  $n"
}
$sumsPath = Join-Path $Root 'dist\SHA256SUMS.txt'
[System.IO.File]::WriteAllText($sumsPath, ($sums -join "`n") + "`n", (New-Object System.Text.UTF8Encoding($false)))
Write-Host "SHA256SUMS.txt 写入完成"
$sums | ForEach-Object { Write-Host "  $_" }

# ---------- 2. 创建 release（body 从文件读，避开 here-string 解析问题） ----------
$relBody = [System.IO.File]::ReadAllText("$Root\tools\release_body.md")
$payload = [ordered]@{
    tag_name         = 'v1.0.0'
    target_commitish = 'main'
    name             = '世界时钟 v1.0.0'
    draft            = $false
    prerelease       = $false
    body             = $relBody
} | ConvertTo-Json -Depth 5

$tmp = Join-Path $env:TEMP 'rel.json'
[System.IO.File]::WriteAllText($tmp, $payload, (New-Object System.Text.UTF8Encoding($false)))

# 已存在就先删掉重来
try {
    $old = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/releases/tags/v1.0.0" -Headers $h -TimeoutSec 20
    Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/releases/$($old.id)" -Method Delete -Headers $h -TimeoutSec 20
    Write-Host "删除旧 release $($old.id)"
} catch { }

$rel = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/releases" -Method Post -Headers $h `
    -ContentType 'application/json; charset=utf-8' `
    -Body ([System.IO.File]::ReadAllBytes($tmp)) -TimeoutSec 60
Write-Host "RELEASE: $($rel.html_url)  id=$($rel.id)"

# ---------- 3. 上传资产 ----------
$files = @(
    @{ path = "$Root\dist\WorldClock-zh-v1.0.0.apk";   type = 'application/vnd.android.package-archive' },
    @{ path = "$Root\dist\WorldClock-Intl-v1.0.0.apk"; type = 'application/vnd.android.package-archive' },
    @{ path = "$Root\dist\WorldClock-single.html";     type = 'text/html' },
    @{ path = $sumsPath;                               type = 'text/plain' }
)

foreach ($f in $files) {
    $name = [System.IO.Path]::GetFileName($f.path)
    $uploadUrl = "https://uploads.github.com/repos/$REPO/releases/$($rel.id)/assets?name=$([uri]::EscapeDataString($name))"
    $uh = @{
        Authorization  = "token $tok"
        'User-Agent'   = 'yg-dsh'
        Accept         = 'application/vnd.github+json'
        'Content-Type' = $f.type
    }
    try {
        $a = Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $uh `
            -Body ([System.IO.File]::ReadAllBytes($f.path)) -TimeoutSec 600
        Write-Host ("  OK   {0}  {1:N1} KB" -f $a.name, ($a.size / 1KB))
    } catch {
        Write-Host ("  FAIL {0}: {1}" -f $name, $_.Exception.Message)
        if ($_.ErrorDetails) { Write-Host $_.ErrorDetails.Message }
    }
}

# ---------- 4. 校验 ----------
Write-Host ""
Write-Host "--- release assets ---"
$chk = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/releases/tags/v1.0.0" -Headers $h -TimeoutSec 30
$chk.assets | ForEach-Object { Write-Host ("{0}  {1:N1} KB  {2}" -f $_.name, ($_.size / 1KB), $_.state) }
