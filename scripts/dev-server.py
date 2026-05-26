#!/usr/bin/env python3
"""Локальный статический сервер (многопоточный) для ES modules."""

from __future__ import annotations

import argparse
import functools
import http.server
import os
import socketserver
import sys
import urllib.error
import urllib.parse
import urllib.request

BYBIT_API_BASES = (
"https://api.bybit.com",
"https://api.bytick.com",
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
                with urllib.request.urlopen(req, timeout=20) as upstream:
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
