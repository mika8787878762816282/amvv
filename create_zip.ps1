$sourceFolder = "c:\Users\SAMUEL SIBONY\antigravity\amg-renovation"
$destinationZip = "c:\Users\SAMUEL SIBONY\antigravity\amg-renovation\amg-renovation-source.zip"
$buildZip = "c:\Users\SAMUEL SIBONY\antigravity\amg-renovation\amg-renovation-build.zip"

# Delete existing zips
if (Test-Path $destinationZip) { Remove-Item $destinationZip }
if (Test-Path $buildZip) { Remove-Item $buildZip }

# Zip Source Code (excluding node_modules)
Write-Host "Zipping source code..."
Compress-Archive -Path "$sourceFolder\src", "$sourceFolder\public", "$sourceFolder\n8n", "$sourceFolder\index.html", "$sourceFolder\package.json", "$sourceFolder\vite.config.ts", "$sourceFolder\tsconfig.json", "$sourceFolder\tailwind.config.js", "$sourceFolder\postcss.config.js", "$sourceFolder\README.md", "$sourceFolder\DEPLOY.md", "$sourceFolder\.env" -DestinationPath $destinationZip

# Zip Build Output
Write-Host "Zipping build output..."
if (Test-Path "$sourceFolder\dist") {
    Compress-Archive -Path "$sourceFolder\dist\*" -DestinationPath $buildZip
} else {
    Write-Warning "Dist folder not found. Run 'npm run build' first."
}

Write-Host "Export complete!"
Write-Host "Source: $destinationZip"
Write-Host "Build: $buildZip"
