import os
import sys
import webbrowser
import threading
import time
import uvicorn

def open_browser():
    time.sleep(1.5)
    url = "http://127.0.0.1:8000"
    print(f"\n[SYSTEM] 브라우저를 자동 실행합니다: {url}")
    webbrowser.open(url)

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    
    print("=" * 60)
    print("  삼양 이노켐 BPA - Silo 수입 모니터링 시스템 v2.0")
    print("  AVEVA PI Web API Live Integration")
    print("=" * 60)
    print(" * Web Server URL: http://127.0.0.1:8000")
    print(" * API Docs:       http://127.0.0.1:8000/docs")
    print("=" * 60)
    
    # 브라우저 백그라운드 오픈
    threading.Thread(target=open_browser, daemon=True).start()
    
    # FastAPI 서버 구동
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, log_level="info")
