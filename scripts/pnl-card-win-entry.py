#!/usr/bin/env python3
"""
Windows PyInstaller entry — тот же CLI, что generate-bybit-pnl-*.py.
Диспетчер: --filled → diary, иначе позиции.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent


def _scripts_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)
    return SCRIPTS_DIR


def _load(name: str, filename: str):
    path = _scripts_dir() / filename
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {path}")
    mod = importlib.util.module_from_spec(spec)
    # dataclasses требуют модуль в sys.modules до exec_module (importlib dynamic load).
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def main() -> None:
    if "--filled" in sys.argv:
        _load("pnl_diary", "generate-bybit-pnl-diary-card.py").main()
        return
    _load("pnl_position", "generate-bybit-pnl-card.py").main()


if __name__ == "__main__":
    main()
