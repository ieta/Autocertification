# -*- mode: python ; coding: utf-8 -*-
import os
import sys
from PyInstaller.utils.hooks import collect_all, collect_submodules

base_dir = os.path.abspath(SPECPATH)

datas = [
    (os.path.join(base_dir, 'frontend', 'dist'), os.path.join('frontend', 'dist')),
    (os.path.join(base_dir, 'backend', 'config'), os.path.join('backend', 'config')),
    (os.path.join(base_dir, 'backend', 'assets'), os.path.join('backend', 'assets')),
    (os.path.join(base_dir, 'backend', 'data'), os.path.join('backend', 'data')),
]

hiddenimports = [
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'fastapi',
    'pydantic',
    'reportlab',
    'reportlab.pdfgen.canvas',
    'reportlab.platypus',
    'reportlab.lib.colors',
    'reportlab.lib.pagesizes',
    'reportlab.lib.styles',
    'reportlab.pdfbase.ttfonts',
    'reportlab.pdfbase.pdfmetrics',
    'win32com',
    'win32com.client',
    'pythoncom',
    'pywintypes',
    'sqlite3',
    'backend',
    'backend.main',
    'backend.routers.silo_router',
    'backend.routers.analysis_router',
    'backend.routers.report_router',
    'backend.services.pi_service',
    'backend.services.gmail_service',
    'backend.services.process_analyzer',
    'backend.services.report_generator',
    'backend.services.audit_service',
    'backend.services.mail_service',
    'backend.services.lot_service',
]

# collect_all for complex packages
for pkg in ['uvicorn', 'fastapi', 'reportlab']:
    tmp_ret = collect_all(pkg)
    datas += tmp_ret[0]
    hiddenimports += tmp_ret[2]

a = Analysis(
    [os.path.join(base_dir, 'run.py')],
    pathex=[base_dir],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['matplotlib', 'scipy', 'tkinter', 'IPython', 'pytest', 'PIL.TkImagePlugin'],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='CertificateAutomation',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
