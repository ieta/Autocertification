import os
import sqlite3
import json
import datetime
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("AUDIT-SERVICE")
logging.basicConfig(level=logging.INFO)

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "certification.db")
CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config", "config.json")

class AuditService:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_conn() as conn:
            cur = conn.cursor()
            # 1. 감사 로그 테이블
            cur.execute("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    lot_no TEXT NOT NULL,
                    customer_name TEXT NOT NULL,
                    product_name TEXT DEFAULT 'BISPHENOL-A',
                    action TEXT NOT NULL,
                    operator TEXT DEFAULT '협력업체',
                    details TEXT
                )
            """)
            # 2. 시스템 상태 키-값 저장소 (마지막 메일 발송일자 등)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS system_state (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def get_state(self, key: str, default: Optional[str] = None) -> Optional[str]:
        with self._get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT value FROM system_state WHERE key = ?", (key,))
            row = cur.fetchone()
            return row["value"] if row else default

    def set_state(self, key: str, value: str):
        with self._get_conn() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO system_state (key, value, updated_at) 
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
            """, (key, value))
            conn.commit()

    def log_issue_event(
        self,
        lot_no: str,
        customer_name: str,
        action: str = "ISSUED",
        operator: str = "협력업체",
        details: Optional[Dict[str, Any]] = None
    ):
        """성적서 발행/다운로드 감사 이벤트 기록"""
        details_str = json.dumps(details or {}, ensure_ascii=False)
        with self._get_conn() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO audit_logs (lot_no, customer_name, action, operator, details)
                VALUES (?, ?, ?, ?, ?)
            """, (lot_no, customer_name, action, operator, details_str))
            conn.commit()
        logger.info(f"[AUDIT] Event logged: Lot={lot_no}, Customer={customer_name}, Action={action}")

        # 당일 첫 번째 발행 시 전일 발행 리포트 자동 메일링 체크
        self.check_and_trigger_daily_report()

    def get_logs_by_date(self, target_date_str: str) -> List[Dict[str, Any]]:
        """특정 일자(YYYY-MM-DD)의 감사 로그 조회"""
        with self._get_conn() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, datetime(created_at, 'localtime') as created_at_kst,
                       lot_no, customer_name, product_name, action, operator, details
                FROM audit_logs
                WHERE date(created_at, 'localtime') = ?
                ORDER BY id ASC
            """, (target_date_str,))
            rows = cur.fetchall()
            return [dict(r) for r in rows]

    def get_recent_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """최근 감사 로그 조회"""
        with self._get_conn() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, datetime(created_at, 'localtime') as created_at_kst,
                       lot_no, customer_name, product_name, action, operator, details
                FROM audit_logs
                ORDER BY id DESC
                LIMIT ?
            """, (limit,))
            rows = cur.fetchall()
            return [dict(r) for r in rows]

    def check_and_trigger_daily_report(self, force: bool = False) -> Dict[str, Any]:
        """
        당일 첫 발행 시 전날(또는 미보고된 최근 일자)의 발행 이력 및 MIS 수치를 담당자에게 자동 메일링
        """
        today_str = datetime.date.today().strftime("%Y-%m-%d")
        last_reported_date = self.get_state("last_daily_mail_date", "2000-01-01")

        if not force and last_reported_date >= today_str:
            return {"status": "skipped", "message": "오늘 이미 전일 리포트가 발송되었거나 발송 대상이 아닙니다."}

        # 전일 날짜 계산 (어제)
        yesterday_str = (datetime.date.today() - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        target_date = yesterday_str if not force else today_str

        # 해당 일자의 발행 이력 조회
        logs = self.get_logs_by_date(target_date)
        if not logs and not force:
            # 어제 발행된 내역이 없다면 발송일자만 오늘로 갱신하고 종료
            self.set_state("last_daily_mail_date", today_str)
            logger.info(f"[AUDIT-MAIL] {target_date} 발행 내역이 없어 메일 발송 생략 (마킹 완료)")
            return {"status": "skipped", "message": f"{target_date} 발행 내역 없음"}

        # 메일 발송 수행
        from backend.services.mail_service import mail_service
        success = mail_service.send_daily_summary_mail(target_date=target_date, logs=logs)

        if success:
            self.set_state("last_daily_mail_date", today_str)
            logger.info(f"[AUDIT-MAIL] {target_date} 일일 마감 리포트 메일 발송 성공!")
            return {"status": "sent", "date": target_date, "count": len(logs)}
        else:
            return {"status": "failed", "message": "Outlook 메일 발송 실패"}

audit_service = AuditService()
