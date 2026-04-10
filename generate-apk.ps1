$packageOptions = @{
    name = "Brand Jamaica Magazine"
    packageId = "com.brandjamaica.magazine"
    version = "1.0.0"
    versionCode = 1
    host = "kushlabs-6.github.io"
    startUrl = "/brand-jamaica-magazine/"
    themeColor = "#009b3a"
    backgroundColor = "#fcebd0"
    iconUrl = "https://kushlabs-6.github.io/brand-jamaica-magazine/icon-512.png"
    maskableIconUrl = "https://kushlabs-6.github.io/brand-jamaica-magazine/icon-512.png"
    monochromeIconUrl = "https://kushlabs-6.github.io/brand-jamaica-magazine/icon-512.png"
    appFallbackBehavior = "customTab"
    generateAssetStatements = $true
    navigationColor = "#009b3a"
    navigationColorDark = "#000000"
    navigationDividerColor = "#009b3a"
    navigationDividerColorDark = "#000000"
    orientation = "default"
    display = "standalone"
    shortcuts = @()
}

$body = $packageOptions | ConvertTo-Json -Depth 5
Write-Host "Sending request to PWABuilder..."

try {
    $response = Invoke-WebRequest `
        -Uri "https://pwabuilder-api-prod.azurewebsites.net/packages/create" `
        -Method Post `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body $body `
        -TimeoutSec 120

    Write-Host "Status: $($response.StatusCode)"

    if ($response.StatusCode -eq 200) {
        $outPath = "C:\Users\demol\Desktop\Brand Jamaica Magazine\BrandJamaica-Android.zip"
        [System.IO.File]::WriteAllBytes($outPath, $response.Content)
        Write-Host "SUCCESS: APK package saved to $outPath"
    } else {
        Write-Host "Response: $($response.Content)"
    }
} catch {
    Write-Host "Error: $_"
    Write-Host $_.Exception.Response.StatusCode
}
