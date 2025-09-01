# Fake NectiqNode readings loop
$deviceId = "NectiqNode_1"
$webhookUrl = "http://localhost:8888/api/particle-webhook"
$secret = "Nectiq_Hive_Main"

while ($true) {
    # Generate random-ish values
    $temp = [math]::Round((30 + (Get-Random -Minimum -2 -Maximum 5)), 1)   # around 30–35°C
    $hum  = [math]::Round((50 + (Get-Random -Minimum -5 -Maximum 10)), 1)  # around 50–60%
    $sound = (Get-Random -Minimum 35 -Maximum 70)                          # dB range

    $payload = @{
        event        = "nectiq/readings"
        data         = "{""t"":$temp,""h"":$hum,""s"":$sound}"
        published_at = (Get-Date).ToUniversalTime().ToString("o")
        device_id    = $deviceId
    } | ConvertTo-Json -Depth 3

    try {
        Invoke-RestMethod `
          -Uri $webhookUrl `
          -Method POST `
          -Body $payload `
          -ContentType "application/json" `
          -Headers @{ "X-Webhook-Secret" = $secret }

        Write-Host "Posted reading -> Temp:$temp°C  Hum:$hum%  Sound:$sound dB"
    }
    catch {
        Write-Host "Error posting reading: $_"
    }

    Start-Sleep -Seconds 5
}
