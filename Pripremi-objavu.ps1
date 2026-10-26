# Builds a static export of the site for Cloudflare into .\cloudflare-site.
# The site is a single promotional page with no forms and no database, so we run the ASP.NET Core app, capture the finished HTML and
# copy wwwroot. Cloudflare Workers cannot run ASP.NET Core, and a static page is faster and cheaper anyway.
# Then: cd cloudflare-deploy ; npx wrangler deploy   (log in once with: npx wrangler login)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http   # Windows PowerShell 5.1 does not load it by itself
$koren = $PSScriptRoot
$izdanje = Join-Path $koren 'publish'
$sajt = Join-Path $koren 'cloudflare-site'
$port = 5399
$adresa = "http://localhost:$port"

dotnet publish (Join-Path $koren 'src\Teretana.Web') -c Release -o $izdanje
if ($LASTEXITCODE -ne 0) { throw 'dotnet publish failed' }

if (Test-Path $sajt) { Remove-Item -LiteralPath $sajt -Recurse -Force }
New-Item -ItemType Directory -Path $sajt | Out-Null

# Run the published app from its own folder (otherwise it cannot find wwwroot).
$proces = Start-Process dotnet -ArgumentList 'Teretana.Web.dll', '--urls', $adresa -WorkingDirectory $izdanje -PassThru -WindowStyle Hidden
try {
    $klijent = [System.Net.Http.HttpClient]::new()
    $spremno = $false
    for ($i = 0; $i -lt 40 -and -not $spremno; $i++) {
        try { $null = $klijent.GetStringAsync("$adresa/").Result; $spremno = $true } catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $spremno) { throw 'The application did not start' }

    $utf8 = New-Object System.Text.UTF8Encoding($false)
    # Read the response body (also for 404, which is our own error page) and check it is not empty.
    foreach ($par in @(@('/', 'index.html'), @('/404', '404.html'))) {
        $odgovor = $klijent.GetAsync($adresa + $par[0]).Result
        $tekst = $odgovor.Content.ReadAsStringAsync().Result
        if ($tekst.Length -lt 2000) { throw "Page $($par[0]) is empty or too short ($($tekst.Length) characters)" }
        [System.IO.File]::WriteAllText((Join-Path $sajt $par[1]), $tekst, $utf8)
    }
}
finally {
    if ($proces -and -not $proces.HasExited) { Stop-Process -Id $proces.Id -Force }
}

# Static files (without *.br / *.gz: Cloudflare compresses on its own)
$izvor = Join-Path $izdanje 'wwwroot'
Get-ChildItem -LiteralPath $izvor -Recurse -File |
    Where-Object { $_.Extension -notin '.br', '.gz' } |
    ForEach-Object {
        $relativno = $_.FullName.Substring($izvor.Length).TrimStart('\')
        $odrediste = Join-Path $sajt $relativno
        New-Item -ItemType Directory -Force -Path (Split-Path $odrediste) | Out-Null
        Copy-Item -LiteralPath $_.FullName -Destination $odrediste
    }

[System.IO.File]::WriteAllText((Join-Path $sajt 'robots.txt'), "User-agent: *`nAllow: /`n", (New-Object System.Text.UTF8Encoding($false)))
[System.IO.File]::WriteAllText((Join-Path $sajt '_headers'), "/*`n  X-Content-Type-Options: nosniff`n  Referrer-Policy: strict-origin-when-cross-origin`n  X-Frame-Options: DENY`n/index.html`n  Cache-Control: no-cache`n/img/*`n  Cache-Control: public, max-age=604800`n/fonts/*`n  Cache-Control: public, max-age=31536000, immutable`n", (New-Object System.Text.UTF8Encoding($false)))

$broj = (Get-ChildItem -LiteralPath $sajt -Recurse -File | Measure-Object).Count
Write-Host "Done: $broj files in $sajt"
