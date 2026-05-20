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
echo "  http://127.0.0.1:$PORT/          (Главная)"
echo "  http://127.0.0.1:$PORT/terminal.html"
echo "  http://127.0.0.1:$PORT/coins.html"
echo "  http://127.0.0.1:$PORT/trade-calculator.html"
echo "  http://127.0.0.1:$PORT/alerts/"
echo ""
echo "Нажмите Ctrl+C для остановки."
echo ""

exec python3 -m http.server "$PORT"
