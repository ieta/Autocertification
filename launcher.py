import os
import sys
import subprocess
import time
import webbrowser

APP_TITLE = "삼양 이노켐 BPA 성적서 자동화 시스템 v2.0"
PORT = 8000
URL = f"http://localhost:{PORT}"

def print_banner():
    print("=" * 65)
    print(f"  {APP_TITLE}")
    print("=" * 65)

def get_base_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

def check_python_environment(base_dir):
    venv_dir = os.path.join(base_dir, "venv")
    venv_python = os.path.join(venv_dir, "Scripts", "python.exe")
    venv_pip = os.path.join(venv_dir, "Scripts", "pip.exe")

    req_file = os.path.join(base_dir, "requirements.txt")

    if not os.path.exists(venv_python):
        print("\n[*] 최초 실행 감지: 전용 Python 가상환경(venv)을 생성합니다...")
        try:
            subprocess.run([sys.executable, "-m", "venv", venv_dir], check=True)
            print("[✓] 가상환경 생성 완료!")
        except Exception as e:
            print(f"[!] 가상환경 생성 실패: {e}")
            print("[!] 시스템 기본 Python으로 계속 진행을 시도합니다.")
            return sys.executable

        if os.path.exists(req_file):
            print("\n[*] 필수 Python 라이브러리를 다운로드 및 설치합니다...")
            print("[*] (네트워크 환경에 따라 약 30초~1분 정도 소요될 수 있습니다)")
            try:
                subprocess.run([venv_pip, "install", "-r", req_file], check=True)
                print("[✓] 라이브러리 설치가 성공적으로 완료되었습니다!")
            except Exception as e:
                print(f"[!] 라이브러리 자동 설치 중 오류: {e}")
                print("[!] 인터넷 연결 상태를 확인해 주세요.")

    return venv_python if os.path.exists(venv_python) else sys.executable

def main():
    base_dir = get_base_dir()
    os.chdir(base_dir)
    print_banner()

    python_exec = check_python_environment(base_dir)

    print(f"\n[*] 로컬 웹 서버를 구동 중입니다 (포트: {PORT})...")

    # Uvicorn 서버 실행
    server_cmd = [
        python_exec,
        "-m", "uvicorn",
        "backend.main:app",
        "--host", "0.0.0.0",
        "--port", str(PORT)
    ]

    proc = subprocess.Popen(server_cmd)

    # 1.5초 후 브라우저 자동 오픈
    time.sleep(1.8)
    print(f"[✓] 시스템 정상 가동 완료!")
    print(f"[*] 웹 브라우저를 엽니다: {URL}")
    print("=" * 65)
    print("  ※ 알림: 이 콘솔 창을 닫으면 프로그램이 종료됩니다.")
    print("=" * 65)
    webbrowser.open(URL)

    try:
        proc.wait()
    except KeyboardInterrupt:
        print("\n[*] 사용자에 의해 프로그램을 종료합니다...")
        proc.terminate()

if __name__ == "__main__":
    main()
