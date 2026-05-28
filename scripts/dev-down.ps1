# dev-down.ps1 — para o stack PulsePass (Postgres + Redis no Docker).
# Os terminais de dev você fecha manualmente (Ctrl+C ou X na janela).

$repo = "C:\Users\erick\ticket-real"
Push-Location $repo
docker-compose stop postgres redis
Pop-Location
Write-Host "✅ Postgres e Redis parados (dados preservados em volume)." -ForegroundColor Green
Write-Host "   Pra apagar dados: docker-compose down -v" -ForegroundColor DarkGray
