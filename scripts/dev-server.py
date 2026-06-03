#!/usr/bin/env python3
"""Локальный статический сервер (многопоточный) для ES modules."""

from __future__ import annotations

import argparse
import functools
import http.server
import os
import re
import socketserver
import sys
import urllib.error
import urllib.parse
import urllib.request

BYBIT_API_BASES = (
"https://api.bytick.com",
"https://api.bybit.com",
)

TWELVEDATA_BASE = "https://api.twelvedata.com"
COINGECKO_BASE = "https://api.coingecko.com/api/v3"
COINGECKO_ALLOWED_DAYS = frozenset(
    {"1", "7", "14", "30", "90", "180", "365", "max"}
)
COINGECKO_TOP_IDS = (
    "bitcoin",
    "ethereum",
    "tether",
    "binancecoin",
    "solana",
    "ripple",
    "usd-coin",
    "tron",
    "dogecoin",
    "cardano",
)

INTERVAL_RE = (
    r"^(1min|5min|15min|30min|45min|1h|2h|4h|8h|1day|1week|1month)$"
)


class ThreadingHTTPServer(
    socketserver.ThreadingMixIn,
    http.server.HTTPServer,
):
    daemon_threads = True
    allow_reuse_address = True


class QuietHandler(http.server.SimpleHTTPRequestHandler):

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/bybit":
            self._serve_bybit_proxy(parsed)
            return
        if parsed.path == "/api/twelvedata":
            self._serve_twelvedata_proxy(parsed)
            return
        if parsed.path == "/api/coingecko":
            self._serve_coingecko_proxy(parsed)
            return
        super().do_GET()

    def _serve_bybit_proxy(self, parsed: urllib.parse.ParseResult) -> None:
        qs = urllib.parse.parse_qs(parsed.query)
        path = (qs.get("path") or [""])[0]
        if not path.startswith("/v5/"):
            self.send_error(400, "invalid path")
            return
        for base in BYBIT_API_BASES:
            try:
                req = urllib.request.Request(
                    f"{base}{path}",
                    headers={"Accept": "application/json"},
                )
                with urllib.request.urlopen(req, timeout=8) as upstream:
                    body = upstream.read()
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Cache-Control", "no-cache")
                    self.end_headers()
                    self.wfile.write(body)
                    return
            except (urllib.error.URLError, TimeoutError, OSError):
                continue
        self.send_error(502, "Bybit upstream failed")

    def _serve_twelvedata_proxy(self, parsed: urllib.parse.ParseResult) -> None:
        api_key = (
            os.environ.get("TWELVEDATA_API_KEY")
            or os.environ.get("TWELVE_DATA_API_KEY")
            or ""
        ).strip()
        if not api_key:
            self.send_error(
                500,
                "TWELVEDATA_API_KEY not set (export before ./start.sh)",
            )
            return

        qs = urllib.parse.parse_qs(parsed.query)
        symbol = (qs.get("symbol") or [""])[0].strip()
        interval = (qs.get("interval") or [""])[0].strip()
        outputsize_raw = (qs.get("outputsize") or ["2500"])[0].strip()

        if (
            not symbol
            or len(symbol) > 32
            or not re.fullmatch(r"[A-Za-z0-9./:_-]+", symbol)
        ):
            self.send_error(400, "invalid symbol")
            return

        if not interval or not re.fullmatch(INTERVAL_RE, interval):
            self.send_error(400, "invalid interval")
            return

        try:
            outputsize = max(1, min(5000, int(outputsize_raw)))
        except ValueError:
            outputsize = 2500

        url = (
            f"{TWELVEDATA_BASE}/time_series?"
            + urllib.parse.urlencode(
                {
                    "symbol": symbol,
                    "interval": interval,
                    "outputsize": str(outputsize),
                    "apikey": api_key,
                }
            )
        )

        try:
            req = urllib.request.Request(
                url,
                headers={"Accept": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=25) as upstream:
                body = upstream.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Cache-Control", "no-cache")
                self.end_headers()
                self.wfile.write(body)
        except (urllib.error.URLError, TimeoutError, OSError) as err:
            self.send_error(502, f"Twelve Data upstream failed: {err}")

    def _fetch_coingecko_json(self, path: str) -> object:
        url = f"{COINGECKO_BASE}{path}"
        req = urllib.request.Request(
            url,
            headers={
                "Accept": "application/json",
                "User-Agent": "Multichart/1.0 (btc-dominance)",
            },
        )
        with urllib.request.urlopen(req, timeout=25) as upstream:
            import json

            return json.loads(upstream.read().decode("utf-8"))

    def _nearest_cap(self, sorted_caps: list, t_ms: int) -> float | None:
        if not sorted_caps:
            return None
        lo, hi = 0, len(sorted_caps) - 1
        if t_ms <= sorted_caps[0][0]:
            return sorted_caps[0][1]
        if t_ms >= sorted_caps[hi][0]:
            return sorted_caps[hi][1]
        while lo <= hi:
            mid = (lo + hi) // 2
            mid_t = sorted_caps[mid][0]
            if mid_t == t_ms:
                return sorted_caps[mid][1]
            if mid_t < t_ms:
                lo = mid + 1
            else:
                hi = mid - 1
        candidates = []
        if lo < len(sorted_caps):
            candidates.append(sorted_caps[lo])
        if lo > 0:
            candidates.append(sorted_caps[lo - 1])
        best = None
        best_diff = 10**18
        for t, cap in candidates:
            diff = abs(t - t_ms)
            if diff < best_diff:
                best_diff = diff
                best = cap
        max_diff = 48 * 3600 * 1000 if len(sorted_caps) > 400 else 3 * 3600 * 1000
        if best_diff > max_diff:
            return None
        return best

    def _build_dominance_series(
        self, btc_caps: list, total_caps: list
    ) -> list[dict[str, float | int]]:
        sorted_total = sorted(total_caps, key=lambda x: x[0])
        by_time: dict[int, float] = {}
        for t_ms, btc_cap in btc_caps:
            total_cap = self._nearest_cap(sorted_total, int(t_ms))
            if not total_cap or total_cap <= 0 or btc_cap <= 0:
                continue
            pct = (btc_cap / total_cap) * 100.0
            if pct <= 0 or pct > 100:
                continue
            time_sec = int(t_ms // 1000)
            by_time[time_sec] = round(pct, 2)
        return [
            {"time": t, "value": v}
            for t, v in sorted(by_time.items())
        ]

    def _send_json(self, status: int, payload: object) -> None:
        import json

        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def _fetch_total_cap_series_estimated(self, days: str) -> tuple[list, str]:
        charts = []
        for coin_id in COINGECKO_TOP_IDS:
            try:
                chart = self._fetch_coingecko_json(
                    f"/coins/{coin_id}/market_chart?vs_currency=usd&days={urllib.parse.quote(days)}"
                )
                charts.append(
                    {"id": coin_id, "caps": chart.get("market_caps") or []}
                )
            except (urllib.error.URLError, TimeoutError, OSError, ValueError):
                charts.append({"id": coin_id, "caps": []})
        btc = next((c for c in charts if c["id"] == "bitcoin"), None)
        if not btc or not btc["caps"]:
            raise ValueError("CoinGecko: нет BTC market_chart")
        sorted_coins = [
            {
                "id": c["id"],
                "caps": sorted(c["caps"], key=lambda x: x[0]),
            }
            for c in charts
            if c["caps"]
        ]
        global_snap = self._fetch_coingecko_json("/global")
        total_now = float(
            global_snap.get("data", {}).get("total_market_cap", {}).get("usd") or 0
        )
        last_t = btc["caps"][-1][0]
        sum_now = 0.0
        for coin in sorted_coins:
            cap = self._nearest_cap(coin["caps"], int(last_t))
            if cap:
                sum_now += cap
        scale = (total_now / sum_now) if total_now > 0 and sum_now > 0 else 1.0
        total_caps: list[list] = []
        for t_ms, _ in btc["caps"]:
            s = 0.0
            for coin in sorted_coins:
                cap = self._nearest_cap(coin["caps"], int(t_ms))
                if cap:
                    s += cap
            if s > 0:
                total_caps.append([t_ms, s * scale])
        return total_caps, "coingecko_top6_estimate"

    def _load_static_dominance_cache(self, days: str) -> dict | None:
        import json
        import time

        cache_path = os.path.join(
            os.path.dirname(__file__), "..", "data", "btc-dominance-cache.json"
        )
        cache_path = os.path.abspath(cache_path)
        if not os.path.isfile(cache_path):
            return None
        try:
            raw = json.loads(open(cache_path, encoding="utf-8").read())
            now_sec = int(time.time())
            if days == "max":
                span = 365 * 86400
            else:
                try:
                    span = max(2, int(days)) * 86400
                except ValueError:
                    span = 90 * 86400
            cut = now_sec - span
            points = [p for p in (raw.get("points") or []) if p.get("time", 0) >= cut]
            if not points:
                return None
            return {
                "ok": True,
                "source": "cache",
                "method": f"{raw.get('method', 'cache')}_static",
                "days": days,
                "current": raw.get("current") or points[-1]["value"],
                "points": points,
                "pointCount": len(points),
                "stale": True,
                "cacheUpdatedAt": raw.get("updatedAt"),
                "updatedAt": int(time.time() * 1000),
            }
        except (OSError, ValueError, TypeError):
            return None

    def _serve_coingecko_proxy(self, parsed: urllib.parse.ParseResult) -> None:
        qs = urllib.parse.parse_qs(parsed.query)
        mode = (qs.get("mode") or ["global"])[0].strip()
        try:
            if mode == "global":
                try:
                    data = self._fetch_coingecko_json("/global")
                    pct = (
                        data.get("data", {})
                        .get("market_cap_percentage", {})
                        .get("btc")
                    )
                    current = round(float(pct), 2) if pct is not None else None
                except (urllib.error.URLError, TimeoutError, OSError, ValueError):
                    cached = self._load_static_dominance_cache("90")
                    current = cached.get("current") if cached else None
                self._send_json(
                    200,
                    {
                        "ok": True,
                        "source": "coingecko",
                        "btcDominance": current,
                        "updatedAt": int(__import__("time").time() * 1000),
                    },
                )
                return

            if mode == "dominance":
                days = (qs.get("days") or ["90"])[0].strip()
                if days not in COINGECKO_ALLOWED_DAYS:
                    self._send_json(
                        400,
                        {
                            "ok": False,
                            "error": "invalid_days",
                            "allowed": sorted(COINGECKO_ALLOWED_DAYS),
                        },
                    )
                    return
                try:
                    btc_chart = self._fetch_coingecko_json(
                        f"/coins/bitcoin/market_chart?vs_currency=usd&days={urllib.parse.quote(days)}"
                    )
                    total_caps, method = self._fetch_total_cap_series_estimated(days)
                    btc_caps = btc_chart.get("market_caps") or []
                    points = self._build_dominance_series(btc_caps, total_caps)
                    if not points:
                        raise ValueError("empty series")
                    self._send_json(
                        200,
                        {
                            "ok": True,
                            "source": "coingecko",
                            "method": method,
                            "days": days,
                            "current": points[-1]["value"],
                            "points": points,
                            "pointCount": len(points),
                            "stale": False,
                            "updatedAt": int(__import__("time").time() * 1000),
                        },
                    )
                    return
                except (urllib.error.URLError, TimeoutError, OSError, ValueError) as err:
                    cached = self._load_static_dominance_cache(days)
                    if cached:
                        self._send_json(200, cached)
                        return
                    self._send_json(
                        503,
                        {
                            "ok": False,
                            "error": str(err),
                            "hint": "rate limit — retry later",
                        },
                    )
                    return

            self._send_json(
                400,
                {"ok": False, "error": "invalid_mode", "modes": ["global", "dominance"]},
            )
        except urllib.error.HTTPError as err:
            cached = None
            if mode == "dominance":
                days = (qs.get("days") or ["90"])[0].strip()
                cached = self._load_static_dominance_cache(days)
            if cached:
                self._send_json(200, cached)
                return
            self._send_json(
                429 if err.code == 429 else 502,
                {"ok": False, "error": f"CoinGecko HTTP {err.code}"},
            )
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as err:
            self._send_json(502, {"ok": False, "error": str(err)})

    def log_message(
        self,
        fmt: str,
        *args: object,
    ) -> None:
        if args and str(args[1]).startswith("4"):
            super().log_message(fmt, *args)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def main() -> int:

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("PORT", "8080")),
    )
    args = parser.parse_args()

    root = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..")
    )
    os.chdir(root)

    handler = functools.partial(
        QuietHandler,
        directory=root,
    )

    try:
        httpd = ThreadingHTTPServer(
            ("127.0.0.1", args.port),
            handler,
        )
    except OSError as err:
        print(
            f"Не удалось запустить порт {args.port}: {err}",
            file=sys.stderr,
        )
        return 1

    print(f"Serving {root}")
    print(f"http://127.0.0.1:{args.port}/")
    print("Ctrl+C — остановка")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        return 0

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
