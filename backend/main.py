import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.routers.silo_router import router as silo_router
from backend.routers.analysis_router import router as analysis_router
from backend.routers.report_router import router as report_router

app = FastAPI(
    title="삼양 QC - Silo 수입 현황 및 성적서 자동화",
    description="AVEVA PI Web API 연동 기반 Silo 실시간 수입 모니터링 및 성적서 자동 채번 시스템",
    version="2.0.0"
)

# CORS 설정 (Vite 개발 서버 포트 지원)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(silo_router)
app.include_router(analysis_router)
app.include_router(report_router)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Silo Monitoring Backend"}

# Frontend dist 정적 서빙 (빌드된 경우)
def get_frontend_dist():
    # 1. PyInstaller _MEIPASS 내부 번들 경로
    if hasattr(sys, '_MEIPASS'):
        p = os.path.join(sys._MEIPASS, "frontend", "dist")
        if os.path.exists(p):
            return p
    # 2. 실행파일과 같은 폴더에 있는 frontend/dist
    if getattr(sys, 'frozen', False):
        p = os.path.join(os.path.dirname(sys.executable), "frontend", "dist")
        if os.path.exists(p):
            return p
    # 3. 소스코드 상대경로
    p = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
    return p

frontend_dist = get_frontend_dist()
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Frontend not built yet."}
