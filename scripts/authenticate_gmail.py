import os
import sys

# 프로젝트 루트를 sys.path에 추가
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, base_dir)

from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from backend.services.gmail_service import SCOPES

def main():
    print("=" * 60)
    print("  Google Gmail OAuth 2.0 사용자 계정 인증 마법사")
    print("=" * 60)
    
    user_home = os.path.expanduser("~")
    cred_path = os.path.join(user_home, ".google", "credentials.json")
    token_path = os.path.join(user_home, ".google", "token.json")
    
    print(f"[*] 클라이언트 자격 증명: {cred_path}")
    print(f"[*] 갱신될 토큰 파일:     {token_path}")
    print("\n브라우저 창이 열리면 사용할 Google 계정으로 로그인 후 권한을 승인해 주세요...")
    
    try:
        flow = InstalledAppFlow.from_client_secrets_file(cred_path, SCOPES)
        creds = flow.run_local_server(port=0)
        
        with open(token_path, "w", encoding="utf-8") as f:
            f.write(creds.to_json())
            
        service = build("gmail", "v1", credentials=creds)
        profile = service.users().getProfile(userId="me").execute()
        
        print("\n" + "=" * 60)
        print("🎉 Google Gmail 계정 인증에 성공하였습니다!")
        print(f" - 연동 계정:     {profile.get('emailAddress')}")
        print(f" - 총 메시지 수:  {profile.get('messagesTotal')}건")
        print(f" - 토큰 저장 위치: {token_path}")
        print("=" * 60)
    except Exception as e:
        print(f"\n❌ 인증 중 오류 발생: {e}")

if __name__ == "__main__":
    main()
