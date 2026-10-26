import os
import json
import urllib.parse
from fastapi import APIRouter, HTTPException, Query, Response
from typing import List, Dict, Any, Optional

from backend.services.report_generator import report_generator
from backend.services.audit_service import audit_service
from backend.services.process_analyzer import process_analyzer
from backend.services.gmail_service import gmail_service
from backend.services.pi_service import pi_service
import datetime

router = APIRouter(prefix="/api/reports", tags=["Reports"])

CUSTOMERS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config", "customers.json")

@router.get("/customers")
def get_customers() -> List[Dict[str, Any]]:
    """등록된 출하 고객사 목록 반환"""
    if os.path.exists(CUSTOMERS_FILE):
        try:
            with open(CUSTOMERS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    # 기본 폴백 목록
    return [
        {"id": 1, "customer": "삼양화성", "product": "BISPHENOL-A", "template_name": "삼양화성 전용 (Prill Size 포함)"},
        {"id": 2, "customer": "국도화학", "product": "BISPHENOL-A", "template_name": "국도화학 전용 (Alkali 색상 포함)"},
        {"id": 3, "customer": "롯데케미칼(기초소재)", "product": "BISPHENOL-A", "template_name": "표준 공용 양식"},
        {"id": 4, "customer": "롯데케미칼(첨단소재)", "product": "BISPHENOL-A", "template_name": "표준 공용 양식"},
        {"id": 5, "customer": "아이씨케미칼", "product": "BISPHENOL-A", "template_name": "표준 공용 양식"},
        {"id": 6, "customer": "표준(공용)", "product": "BISPHENOL-A", "template_name": "표준 공용 양식"}
    ]

@router.get("/lot/{lot_no}/pdf")
def get_lot_pdf(
    lot_no: str,
    customer_name: str = Query("표준(공용)", description="출하 고객사명"),
    product_name: str = Query("BISPHENOL-A", description="제품명"),
    issue_date: Optional[str] = Query(None, description="발행일자 (YYYY-MM-DD 또는 YYYY.MM.DD)"),
    download: bool = Query(False, description="다운로드 첨부 파일 여부 (기본: 브라우저 뷰어 인라인)")
):
    """
    지정 Lot No.와 고객사에 맞는 공식 성적서 PDF를 생성하여 브라우저 뷰어 또는 파일 다운로드로 반환합니다.
    (호출 시 자동으로 SQLite 감사 로그가 기록되며 당일 첫 발행 시 전일 메일링이 자동 트리거됩니다)
    """
    try:
        pdf_bytes = report_generator.generate_pdf_bytes(
            lot_no=lot_no,
            customer_name=customer_name,
            product_name=product_name,
            issue_date=issue_date
        )

        # 감사 로그 기록 (당일 첫 발행 시 전일 리포트 자동 메일링 포함)
        action_type = "DOWNLOAD" if download else "VIEW"
        audit_service.log_issue_event(
            lot_no=lot_no,
            customer_name=customer_name,
            action=action_type,
            operator="협력업체"
        )

        filename = f"{customer_name}_{lot_no}_성적서.pdf"
        encoded_filename = urllib.parse.quote(filename)

        disposition_type = "attachment" if download else "inline"
        headers = {
            "Content-Disposition": f"{disposition_type}; filename*=UTF-8''{encoded_filename}",
            "Content-Type": "application/pdf"
        }

        return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"성적서 PDF 생성 오류: {str(e)}")

@router.get("/audit-logs")
def get_audit_logs(limit: int = 30) -> List[Dict[str, Any]]:
    """최근 성적서 발행 감사 로그 반환"""
    return audit_service.get_recent_logs(limit=limit)

@router.post("/trigger-daily-mail")
def trigger_daily_mail(target_date: Optional[str] = None, force: bool = True) -> Dict[str, Any]:
    """전일(또는 지정 일자) 성적서 발행 이력 및 MIS 데이터 메일링 수동 트리거"""
    try:
        t_date = target_date or (datetime.date.today() - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        logs = audit_service.get_logs_by_date(t_date)
        from backend.services.mail_service import mail_service
        success = mail_service.send_daily_summary_mail(target_date=t_date, logs=logs)
        return {
            "status": "ok" if success else "failed",
            "date": t_date,
            "log_count": len(logs),
            "message": f"{t_date} 일일 리포트 메일 발송 완료" if success else "메일 발송 실패"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"메일 발송 실패: {str(e)}")

@router.get("/lot/{lot_no}/mis-tsv")
def get_lot_mis_tsv(lot_no: str) -> Dict[str, Any]:
    """사내 MIS 전산 입력용 탭 구분 텍스트(TSV) 반환 (Excel / MIS 직접 붙여넣기용)"""
    try:
        # Silo 이력에서 구간 검색
        history = pi_service.get_silo_import_history(days=30)
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

        pts = gmail_service.fetch_latest_analysis_points()
        res = process_analyzer.calculate_lot_values(
            lot_no=lot_no,
            st_date=st_d or datetime.date.today().strftime("%Y-%m-%d"),
            st_time=st_t,
            end_date=end_d or datetime.date.today().strftime("%Y-%m-%d"),
            end_time=end_t,
            analysis_points=pts
        )
        items = res.get("items", {})

        columns = [
            "Appearance", "Freezing Point", "Melt Color", "Solution Color (Alcohol)",
            "Solution Color (Alkali)", "BPA Purity (dry)", "Phenol", "2,4'-BPA",
            "Water", "Iron", "Ash"
        ]

        vals = []
        for col in columns:
            found = "-"
            for ik, iv in items.items():
                if col.lower() in ik.lower() or ik.lower() in col.lower():
                    found = iv.get("value", "-")
                    break
            vals.append(str(found))

        header_tsv = "\t".join(columns)
        values_tsv = "\t".join(vals)

        return {
            "lot_no": lot_no,
            "header_tsv": header_tsv,
            "values_tsv": values_tsv,
            "tsv_full": f"{header_tsv}\n{values_tsv}",
            "dict": dict(zip(columns, vals))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TSV 생성 실패: {str(e)}")
