import os
import sys

# Windows GUI (console=False / pythonw) 모드에서는 sys.stdout, sys.stderr가 None이 됩니다.
# Uvicorn의 기본 로거(uvicorn.logging.DefaultFormatter)가 sys.stdout.isatty()를 호출하면서
# AttributeError: 'NoneType' object has no attribute 'isatty' 오류가 발생하므로,
# 더미 스트림 객체를 매핑하여 콘솔 없는 환경에서도 안전하게 구동되도록 보장합니다.
class NullWriter:
    def write(self, s):
        pass
    def flush(self):
        pass
    def isatty(self):
        return False

if sys.stdout is None:
    sys.stdout = NullWriter()
if sys.stderr is None:
    sys.stderr = NullWriter()

import multiprocessing
import webbrowser
import threading
import time
import socket
import uvicorn

def wait_and_open_browser(port=8000):
    url = f"http://127.0.0.1:{port}"
    for _ in range(120):  # 최대 6초 대기
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
    except Exception:
        pass

if __name__ == "__main__":
    multiprocessing.freeze_support()

    if getattr(sys, 'frozen', False):
        base_dir = getattr(sys, '_MEIPASS', os.path.dirname(sys.executable))
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))

    os.chdir(base_dir)
    sys.path.insert(0, base_dir)

    from backend.main import app

    threading.Thread(target=wait_and_open_browser, args=(8000,), daemon=True).start()
    # log_config=None을 넘겨 콘솔 출력 의존성을 완전히 제거
    uvicorn.run(app, host="0.0.0.0", port=8000, log_config=None)
