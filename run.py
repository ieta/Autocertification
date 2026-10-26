import os
import sys
import multiprocessing
import webbrowser
import threading
import time
import uvicorn

def open_browser():
    time.sleep(2.0)
    url = "http://127.0.0.1:8000"
    print(f"\n[SYSTEM] 브라우저를 자동 실행합니다: {url}")
    try:
        if sys.platform == "win32":
            os.system(f'start "" "{url}"')
        else:
            webbrowser.open(url)
    except Exception as e:
        print(f"[!] 브라우저 자동 오픈 실패: {e}")

if __name__ == "__main__":
    multiprocessing.freeze_support()

    if getattr(sys, 'frozen', False):
        base_dir = getattr(sys, '_MEIPASS', os.path.dirname(sys.executable))
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))

    os.chdir(base_dir)
    sys.path.insert(0, base_dir)

    from backend.main import app

    print("=" * 65)
    print("  삼양 이노켐 BPA 성적서 자동화 시스템 v2.0 (실행 중)")
    print("  AVEVA PI Web API Live Integration")
    print("=" * 65)
    print(" * Web Server URL: http://127.0.0.1:8000")
    print(" * 종료 방법: 이 콘솔 창을 닫으시면 프로그램이 종료됩니다.")
    print("=" * 65)

    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
