# PyInstaller spec — только Windows CI / локальная сборка .exe
#   pyinstaller scripts/pnl-card-win.spec --distpath desktop/build --workpath desktop/build/.pyi-work -y
from pathlib import Path

block_cipher = None
scripts_dir = Path(SPECPATH).resolve()

a = Analysis(
    [str(scripts_dir / "pnl-card-win-entry.py")],
    pathex=[str(scripts_dir)],
    binaries=[],
    datas=[
        (str(scripts_dir / "generate-bybit-pnl-card.py"), "."),
        (str(scripts_dir / "generate-bybit-pnl-diary-card.py"), "."),
    ],
    hiddenimports=["PIL", "PIL.Image", "PIL.ImageDraw", "PIL.ImageFont"],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="pnl-card-generator",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
