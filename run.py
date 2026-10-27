import os
import sys
import multiprocessing
import webbrowser
import threading
import time
import socket
import uvicorn

def wait_and_open_browser(port=8000):
    """
    고정 대기 시간(sleep) 대신 소켓으로 포트 리스닝을 0.05초 단위로 감지하여
    서버가 준비되는 즉시 0.1초 만에 브라우저를 오픈합니다.
    """
    url = f"http://127.0.0.1:{port}"
    for _ in range(100):  # 최대 5초 대기
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.1):
                break
        except (OSError, ConnectionRefusedError):
            time.sleep(0.05)
    
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

    # 지연 로딩: 앱을 필요한 시점에 불러와 초기 기동 시간 최소화
    from backend.main import app

    threading.Thread(target=wait_and_open_browser, args=(8000,), daemon=True).start()
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning")
