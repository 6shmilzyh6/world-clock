$ErrorActionPreference = 'Stop'
$env:PATH = "D:\新建文件夹\Git\cmd;D:\新建文件夹\Git\mingw64\bin;" + $env:PATH
$env:GIT_TERMINAL_PROMPT = '0'

$tok = (("protocol=https`nhost=github.com`n`n" | git credential fill) | Where-Object { $_ -match '^password=' }) -replace '^password=', ''
$tok = $tok.Trim()
$h = @{ Authorization = "token $tok"; 'User-Agent' = 'yg-dsh' }

$desc = '世界时钟 / World Clock — 按你设定的位置换算世界各地时间，自动处理夏令时，418 个时区，纯离线。Android APK + PWA，中英双语。'
$payload = [ordered]@{
    name        = 'world-clock'
    description = $desc
    homepage    = 'https://6shmilzyh6.github.io/world-clock/'
    private     = $false
    has_issues  = $true
    has_wiki    = $false
    has_projects = $false
    auto_init   = $false
} | ConvertTo-Json -Depth 5

$bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
try {
    $r = Invoke-RestMethod -Uri 'https://api.github.com/user/repos' -Method Post -Headers $h `
        -ContentType 'application/json; charset=utf-8' -Body $bytes -TimeoutSec 40
    Write-Host "CREATED $($r.full_name)"
    Write-Host "clone_url: $($r.clone_url)"
} catch {
    Write-Host "ERR: $($_.Exception.Message)"
    if ($_.ErrorDetails) { Write-Host $_.ErrorDetails.Message }
    exit 1
}
