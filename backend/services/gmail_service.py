import os
import sys
import json
import base64
import logging
from typing import List, Dict, Any, Optional
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from backend.services.process_analyzer import process_analyzer

logger = logging.getLogger("GMAIL-SERVICE")

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send"
]

class GmailService:
    def __init__(self):
        user_home = os.path.expanduser("~")
        global_google_dir = os.path.join(user_home, ".google")
        self.credentials_path = os.path.join(global_google_dir, "credentials.json")
        self.token_path = os.path.join(global_google_dir, "token.json")
        
        # 프로젝트 로컬 폴더
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.cache_dir = os.path.join(base_dir, "data", "raw_mails")
        os.makedirs(self.cache_dir, exist_ok=True)
        self.cached_points: List[Dict[str, Any]] = []

    def get_gmail_service(self):
        creds = None
        if os.path.exists(self.token_path):
            try:
                creds = Credentials.from_authorized_user_file(self.token_path, SCOPES)
            except Exception as e:
                logger.warning(f"[GMAIL-AUTH] 기존 token.json 로드 실패: {e}")
                creds = None

        if creds and creds.expired and creds.refresh_token:
            try:
                logger.info("[GMAIL-AUTH] 만료된 토큰 자동 갱신(Refresh) 시도...")
                creds.refresh(Request())
                with open(self.token_path, "w", encoding="utf-8") as f:
                    f.write(creds.to_json())
                logger.info("[GMAIL-AUTH] 토큰 갱신 성공!")
            except Exception as e:
                logger.warning(f"[GMAIL-AUTH] 토큰 갱신 실패: {e}")
                creds = None

        if not creds or not creds.valid:
            logger.info("[GMAIL-AUTH] 유효한 자격 증명이 없습니다. 재인증이 필요합니다.")
            return None

        return build("gmail", "v1", credentials=creds)

    def fetch_latest_analysis_points(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """
        Gmail에서 '공정분석 내역 조회' 메일을 수집하여 시계열 분석 데이터를 반환합니다.
        Gmail 연결이 원활하지 않은 경우 캐시된 HTML 파일을 자동 폴백 로드합니다.
        """
        if self.cached_points and not force_refresh:
            return self.cached_points

        points = []
        try:
            service = self.get_gmail_service()
            if service:
                query = 'subject:"공정분석"'
                res = service.users().messages().list(userId="me", q=query, maxResults=3).execute()
                messages = res.get("messages", [])
                for m in messages:
                    msg = service.users().messages().get(userId="me", id=m["id"]).execute()
                    html_content = self._extract_html_from_msg(msg)
                    if html_content and "<table" in html_content:
                        # 캐시 파일로도 저장
                        cache_file = os.path.join(self.cache_dir, "latest_analysis_mail.html")
                        with open(cache_file, "w", encoding="utf-8") as f:
                            f.write(html_content)
                        parsed = process_analyzer.parse_mail_html(html_content)
                        if parsed:
                            points.extend(parsed)
                            break
        except Exception as e:
            logger.warning(f"[GMAIL-FETCH-WARN] Gmail API 수집 중 예외 발생, 캐시 폴백 시도: {e}")

        # 캐시 폴백 처리
        if not points:
            points = self._load_from_fallback_cache()

        self.cached_points = points
        return points

    def _load_from_fallback_cache(self) -> List[Dict[str, Any]]:
        for fname in ["latest_analysis_mail.html", "공정분석_내역_조회.html", "raw_body.html"]:
            fpath = os.path.join(self.cache_dir, fname)
            if os.path.exists(fpath):
                try:
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                        html = f.read()
                    parsed = process_analyzer.parse_mail_html(html)
                    if parsed:
                        logger.info(f"[GMAIL-CACHE] 캐시 파일 '{fname}'에서 {len(parsed)}건의 시계열 데이터 복원 완료")
                        return parsed
                except Exception as e:
                    logger.warning(f"[GMAIL-CACHE-WARN] 캐시 로드 오류 ({fname}): {e}")
        return []

    def _extract_html_from_msg(self, msg: Dict[str, Any]) -> str:
        payload = msg.get("payload", {})
        parts = payload.get("parts", [])
        if not parts:
            body = payload.get("body", {}).get("data", "")
            return base64.urlsafe_b64decode(body).decode("utf-8", errors="replace") if body else ""

        for part in parts:
            if part.get("mimeType") == "text/html":
                data = part.get("body", {}).get("data", "")
                if data:
                    return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
        return ""

gmail_service = GmailService()
