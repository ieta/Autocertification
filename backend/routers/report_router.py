import os
import json
import urllib.parse
from fastapi import APIRouter, HTTPException, Query, Response
from typing import List, Dict, Any, Optional

from backend.services.report_generator import report_generator

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
    """
    try:
        pdf_bytes = report_generator.generate_pdf_bytes(
            lot_no=lot_no,
            customer_name=customer_name,
            product_name=product_name,
            issue_date=issue_date
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
