#!/bin/sh
cd "$(dirname "$0")"

PORT=8080

if lsof -ti:"$PORT" >/dev/null 2>&1; then
  echo "Порт $PORT занят — останавливаю старый процесс..."
  lsof -ti:"$PORT" | xargs kill 2>/dev/null
  sleep 0.5
fi

echo ""
echo "Crypto Terminal:"
echo "  http://127.0.0.1:$PORT/                 (Главная / скринер)"
echo "  http://127.0.0.1:$PORT/coins.html       (Монеты)"
echo "  http://127.0.0.1:$PORT/listings.html    (Листинги)"
echo "  http://127.0.0.1:$PORT/terminal.html    (Терминал)"
echo "  http://127.0.0.1:$PORT/alerts/         (Алерты)"
echo "  http://127.0.0.1:$PORT/trade-calculator.html"
echo ""
echo "Нажмите Ctrl+C для остановки."
echo ""

exec python3 scripts/dev-server.py --port "$PORT"
