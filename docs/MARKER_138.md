# Метка 138 — модули Скрипт/Алго, FVP, сплит god-файлов (август 2026)

**Тег:** `metka-138`

## Что вошло

- **Система:** тумблеры «Включить Скрипт» / «Включить АлгоТрейдинг»
  прячут пункты меню и останавливают фон; если скан или бот реально
  работают — стоп, затем уход со страницы (lite-шелл бота не стопает).
- **Рисование:** Fixed Range Volume Profile (два клика, POC/VA, LTF).
- **Алго Pattern 1-2 (копии):** ранний PT3, reverse side, live SL gate;
  qty Bybit от риск-объёма.
- **Скринер:** осциллятор RSI/MACD на виджетах.
- **Безопасность:** escape HTML алертов; allowlist публичных market API;
  credentials/env не в git.
- **Рефактор:** `algo-trading.js` и панели style bar (rect/fib) вынесены
  в модули без смены поведения. CI: `navigator` не обязателен в Node.

Оригинал индикатора Pattern 1-2 не менялся.

## Версии

- Web marker: `v0.138`
- Multichart desktop app: `v1.1.39`
- Mac tag (Multichart): `desktop-v1.1.39`
- Windows tag (Multichart): `desktop-win-v1.1.39`
