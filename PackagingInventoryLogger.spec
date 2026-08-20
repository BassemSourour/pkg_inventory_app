# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_all

# Only the interface is bundled. The workbook and the count
# database are created in the user profile at runtime, so the
# development copies in data/ must not be shipped.
datas = [
    ('app\\templates', 'app\\templates'),
    ('app\\static', 'app\\static'),
]
binaries = []
hiddenimports = ['waitress']

for package in (
    'openpyxl',
    'qrcode',
    'waitress',
    'webview',
    'clr_loader',
    'pythonnet',
):
    package_datas, package_binaries, package_hiddenimports = collect_all(package)
    datas += package_datas
    binaries += package_binaries
    hiddenimports += package_hiddenimports

# pywebview reaches the WebView2 control through pythonnet, and
# neither import is visible to static analysis.
hiddenimports += [
    'clr',
    'webview.platforms.winforms',
]


a = Analysis(
    ['run.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='PackagingInventoryLogger',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='assets\\icon.ico',
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='PackagingInventoryLogger',
)
