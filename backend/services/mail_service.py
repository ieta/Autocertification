import os
import sys
import json
import logging
from typing import List, Dict, Any, Optional

from backend.services.process_analyzer import process_analyzer
from backend.services.gmail_service import gmail_service
from backend.services.pi_service import pi_service

logger = logging.getLogger("MAIL-SERVICE")
logging.basicConfig(level=logging.INFO)

CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config", "config.json")

class MailService:
    def __init__(self, config_path: str = CONFIG_PATH):
        self.config_path = config_path
        self._load_config()

    def _load_config(self):
        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            self.mail_cfg = cfg.get("mail_notification", {})
        except Exception as e:
            logger.warning(f"[MAIL-CFG] Config load failed: {e}")
            self.mail_cfg = {
                "enabled": True,
                "recipients": ["gihwan.kim@samyang.com", "yeongeun.shin@samyang.com"]
            }

    def build_daily_report_html(self, target_date: str, logs: List[Dict[str, Any]]) -> str:
        """전일 발행 이력 및 해당 Lot들의 MIS 입력용 품질분석 종합표 HTML 생성"""
        # 고유 Lot 목록 추출
        unique_lots = list(dict.fromkeys([log["lot_no"] for log in logs]))

        # 각 Lot별 품질 분석치 조회
        points = gmail_service.fetch_latest_analysis_points()
        history = pi_service.get_silo_import_history(days=30)

        lot_analyses = {}
        for lot_no in unique_lots:
            st_d, st_t, end_d, end_t = "", "00:00", "", "23:59"
            for h in history:
                if h.get("lot_no") == lot_no:
                    sp = h.get("start_time", "").split(" ")
                    st_d = sp[0] if len(sp) > 0 else ""
                    st_t = sp[1] if len(sp) > 1 else "00:00"
                    er = h.get("end_time", "")
                    if "진행" not in er and er:
                        ep = er.split(" ")
                        end_d = ep[0] if len(ep) > 0 else ""
                        end_t = ep[1] if len(ep) > 1 else "23:59"
                    break
            res = process_analyzer.calculate_lot_values(
                lot_no=lot_no,
                st_date=st_d or target_date,
                st_time=st_t,
                end_date=end_d or target_date,
                end_time=end_t,
                analysis_points=points
            )
            lot_analyses[lot_no] = res.get("items", {})

        # 1. 발행 이력 테이블 행 생성
        log_rows_html = []
        for idx, log in enumerate(logs, 1):
            log_rows_html.append(f"""
                <tr style="background-color: {'#f8fafc' if idx % 2 == 1 else '#ffffff'};">
                    <td style="padding: 7px; border: 1px solid #cbd5e1; text-align: center;">{idx}</td>
                    <td style="padding: 7px; border: 1px solid #cbd5e1; text-align: center;">{log.get('created_at_kst', '')}</td>
                    <td style="padding: 7px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #0284c7;">{log.get('lot_no')}</td>
                    <td style="padding: 7px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">{log.get('customer_name')}</td>
                    <td style="padding: 7px; border: 1px solid #cbd5e1; text-align: center; color: #059669; font-weight: bold;">{log.get('action')}</td>
                    <td style="padding: 7px; border: 1px solid #cbd5e1; text-align: center;">{log.get('operator')}</td>
                </tr>
            """.strip())

        # 2. MIS 입력용 분석치 테이블 행 생성
        mis_header_keys = [
            "Appearance", "Freezing Point", "Melt Color", "Solution Color (Alcohol)",
            "Solution Color (Alkali)", "BPA Purity (dry)", "Phenol", "2,4'-BPA",
            "Water", "Iron", "Ash"
        ]

        mis_rows_html = []
        for lot_no in unique_lots:
            items = lot_analyses.get(lot_no, {})
            tds = [f"<td style='padding: 7px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #0284c7;'>{lot_no}</td>"]
            for hk in mis_header_keys:
                found_v = "-"
                for ik, iv in items.items():
                    if hk.lower() in ik.lower() or ik.lower() in hk.lower():
                        found_v = iv.get("value", "-")
                        break
                tds.append(f"<td style='padding: 7px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;'>{found_v}</td>")
            mis_rows_html.append(f"<tr style='background-color: #ffffff;'>{''.join(tds)}</tr>")

        html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Malgun Gothic', '맑은 고딕', Dotum, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.5; margin: 0; padding: 15px;">
    <div style="max-width: 920px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 22px; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #0f172a; font-size: 19px;">📋 [일일 성적서 마감 리포트] {target_date} 발행 현황 및 MIS 전산 등록 데이터</h2>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12.5px;">
                당일 첫 성적서 작업 시작에 따라 전일({target_date}) 발행된 성적서 감사 로그 및 MIS 등록용 품질분석 수치를 자동 송부합니다.
            </p>
        </div>

        <h3 style="margin: 18px 0 8px 0; color: #0369a1; font-size: 15px;">1. 성적서 발행 이력 (협력업체 발행 점검용) - 총 {len(logs)}건</h3>
        <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 12.5px; margin-bottom: 24px;">
            <thead>
                <tr style="background-color: #0f172a; color: #ffffff;">
                    <th style="padding: 8px; border: 1px solid #cbd5e1; width: 40px;">No</th>
                    <th style="padding: 8px; border: 1px solid #cbd5e1; width: 140px;">발행 일시 (KST)</th>
                    <th style="padding: 8px; border: 1px solid #cbd5e1; width: 90px;">Lot No.</th>
                    <th style="padding: 8px; border: 1px solid #cbd5e1;">출하 고객사</th>
                    <th style="padding: 8px; border: 1px solid #cbd5e1; width: 80px;">상태</th>
                    <th style="padding: 8px; border: 1px solid #cbd5e1; width: 80px;">작업자</th>
                </tr>
            </thead>
            <tbody>
                {''.join(log_rows_html) if log_rows_html else '<tr><td colspan="6" style="padding: 12px; border: 1px solid #cbd5e1;">발행 이력 없음</td></tr>'}
            </tbody>
        </table>

        <h3 style="margin: 18px 0 8px 0; color: #0369a1; font-size: 15px;">2. MIS 전산 입력용 품질 분석 수치 취합표 (성적서 일치 검증용)</h3>
        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px;">* 사내 MIS 시스템에 성적서와 동일한 수치를 입력할 때 대조하거나 복사하여 활용하시기 바랍니다.</p>
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px;">
                <thead>
                    <tr style="background-color: #1e293b; color: #ffffff; text-align: center;">
                        <th style="padding: 8px; border: 1px solid #cbd5e1;">Lot No</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1;">외관</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1;">FP(℃)</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1;">Melt</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1;">Alcohol</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1;">Alkali</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1;">순도(%)</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1;">PHL(ppm)</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1;">2,4-BPA</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1;">수분(%)</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1;">Iron</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1;">Ash</th>
                    </tr>
                </thead>
                <tbody>
                    {''.join(mis_rows_html) if mis_rows_html else '<tr><td colspan="12" style="padding: 12px; border: 1px solid #cbd5e1; text-align: center;">분석 데이터 없음</td></tr>'}
                </tbody>
            </table>
        </div>
        
        <div style="margin-top: 18px; padding: 10px 14px; background-color: #f1f5f9; border-radius: 6px; font-size: 12px; color: #475569;">
            💡 <strong>안내</strong>: 본 메일은 협력업체 성적서 발행 현황 모니터링 및 MIS 등록 데이터 무결성을 위해 성적서 자동화 시스템에서 발송되었습니다.
        </div>
    </div>
</body>
</html>
        """
        return html

    def send_daily_summary_mail(self, target_date: str, logs: List[Dict[str, Any]]) -> bool:
        """Outlook을 통해 전일 발행 이력 및 MIS 종합표 메일 발송"""
        self._load_config()
        if not self.mail_cfg.get("enabled", True):
            logger.info("[MAIL-OUTLOOK] 메일 알림이 비활성화되어 있어 전송을 생략합니다.")
            return False

        recipients = self.mail_cfg.get("recipients", [])
        if not recipients:
            logger.warning("[MAIL-OUTLOOK] 수신자(recipients) 목록이 비어 있습니다.")
            return False

        subject = f"[성적서 일일 마감 리포트] {target_date} 발행 현황 및 MIS 등록 데이터"
        html_body = self.build_daily_report_html(target_date, logs)

        if sys.platform != "win32":
            logger.info(f"[MAIL-MOCK] Non-Windows 환경 감지: 메일 발송 Mocking 처리 (수신처: {recipients})")
            return True

        try:
            import pythoncom
            import win32com.client
            pythoncom.CoInitialize()

            outlook = win32com.client.Dispatch("Outlook.Application")
            mail = outlook.CreateItem(0)  # olMailItem
            mail.To = "; ".join(recipients)
            mail.Subject = subject
            mail.HTMLBody = html_body

            mail.Send()
            logger.info(f"[MAIL-OUTLOOK] 성공적으로 메일을 발송했습니다: {', '.join(recipients)}")
            return True
        except Exception as e:
            logger.error(f"[MAIL-OUTLOOK-ERROR] Outlook 메일 발송 실패: {e}", exc_info=True)
            return False

    def send_abnormal_alert_mail(
        self,
        lot_no: str,
        customer_name: str,
        failed_items: List[Dict[str, Any]],
        reason: str = "규격 부적합(Spec Out)",
        operator: str = "협력업체"
    ) -> bool:
        """
        이상 징후/오발행 발생 시 담당자에게 즉시 긴급 알림 메일 발송
        """
        self._load_config()
        if not self.mail_cfg.get("enabled", True):
            return False

        recipients = self.mail_cfg.get("recipients", [])
        if not recipients:
            return False

        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        subject = f"[긴급/오발행 주의] Silo 성적서 이상 발행 감지 - Lot {lot_no} ({customer_name})"

        # 부적합 항목 테이블 생성
        rows_html = []
        for item in failed_items:
            rows_html.append(f"""
                <tr style="background-color: #fef2f2;">
                    <td style="padding: 8px; border: 1px solid #fecaca; font-weight: bold; color: #991b1b;">{item.get('name')}</td>
                    <td style="padding: 8px; border: 1px solid #fecaca; text-align: center; color: #dc2626; font-weight: bold; font-size: 14px;">{item.get('value')} {item.get('unit', '')}</td>
                    <td style="padding: 8px; border: 1px solid #fecaca; text-align: center; color: #4b5563;">{item.get('spec')}</td>
                    <td style="padding: 8px; border: 1px solid #fecaca; text-align: center; color: #b91c1c; font-weight: bold;">부적합 (FAIL)</td>
                </tr>
            """.strip())

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
</head>
<body style="font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b;">
    <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 2px solid #ef4444; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #ef4444; padding: 16px 20px; color: #ffffff;">
            <h2 style="margin: 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                ⚠️ [오발행 긴급 알림] 성적서 이상 발행 감지
            </h2>
            <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.95;">
                협력업체에서 제품 규격(Spec)을 충족하지 못했거나 이상 징후가 있는 상태로 성적서를 발행했습니다.
            </p>
        </div>

        <div style="padding: 20px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
                <tr>
                    <td style="padding: 8px 12px; background: #f1f5f9; width: 120px; font-weight: bold; border: 1px solid #cbd5e1;">발생 일시</td>
                    <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">{now_str} (KST)</td>
                </tr>
                <tr>
                    <td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; border: 1px solid #cbd5e1;">대상 Lot No.</td>
                    <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #0284c7; font-size: 15px;">{lot_no}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; border: 1px solid #cbd5e1;">출하 고객사</td>
                    <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold;">{customer_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; border: 1px solid #cbd5e1;">발행 작업자</td>
                    <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">{operator}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 12px; background: #fef2f2; font-weight: bold; border: 1px solid #fecaca; color: #991b1b;">이상 감지 사유</td>
                    <td style="padding: 8px 12px; border: 1px solid #fecaca; color: #dc2626; font-weight: bold;">{reason}</td>
                </tr>
            </table>

            <h3 style="font-size: 14px; margin-bottom: 8px; color: #991b1b;">🚨 기준 미달(Spec Out) 항목 내역</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color: #fee2e2; color: #7f1d1d;">
                        <th style="padding: 8px; border: 1px solid #fecaca; text-align: left;">검사 항목</th>
                        <th style="padding: 8px; border: 1px solid #fecaca; text-align: center;">분석 측정값</th>
                        <th style="padding: 8px; border: 1px solid #fecaca; text-align: center;">기준 규격(Spec)</th>
                        <th style="padding: 8px; border: 1px solid #fecaca; text-align: center;">판정</th>
                    </tr>
                </thead>
                <tbody>
                    {''.join(rows_html) if rows_html else '<tr><td colspan="4" style="padding: 8px; text-align: center;">상세 내역 없음</td></tr>'}
                </tbody>
            </table>

            <div style="padding: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; font-size: 12px; color: #92400e;">
                <strong>⚠️ 담당자 조치 안내:</strong><br>
                해당 Lot 성적서가 고객사/차량에 이미 전달되었는지 신속히 확인하시고, 필요 시 웹앱에서 올바른 Lot 성적서로 재발행 및 MIS 수치를 보정해 주시기 바랍니다.
            </div>
        </div>
    </div>
</body>
</html>
        """

        if sys.platform != "win32":
            logger.info(f"[MAIL-MOCK] Non-Windows 이상 알림 Mocking: {subject} -> {recipients}")
            return True

        try:
            import pythoncom
            import win32com.client
            pythoncom.CoInitialize()

            outlook = win32com.client.Dispatch("Outlook.Application")
            mail = outlook.CreateItem(0)
            mail.To = "; ".join(recipients)
            mail.Subject = subject
            mail.HTMLBody = html_body
            mail.Importance = 2  # olImportanceHigh (높은 중요도)

            mail.Send()
            logger.info(f"[MAIL-ALERT-SENT] 이상 징후 긴급 알림 메일 발송 완료: {lot_no} -> {recipients}")
            return True
        except Exception as e:
            logger.error(f"[MAIL-ALERT-ERROR] 이상 알림 메일 발송 실패: {e}", exc_info=True)
            return False

mail_service = MailService()
