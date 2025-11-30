$baseUrl = "https://darebee.com/images/programs/total-body/web/day"
$outputDir = "static/workouts"

for ($i = 1; $i -le 30; $i++) {
    $day = "{0:D2}" -f $i
    $url = "$baseUrl$day.jpg"
    $output = "$outputDir/day$day.jpg"
    Write-Host "Downloading $url to $output..."
    Invoke-WebRequest -Uri $url -OutFile $output
}
