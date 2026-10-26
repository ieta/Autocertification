from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List
from backend.services.gmail_service import gmail_service
from backend.services.process_analyzer import process_analyzer
from backend.services.pi_service import pi_service

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])

@router.get("/lot/{lot_no}")
def get_lot_analysis(
    lot_no: str,
    st_date: Optional[str] = None,
    st_time: Optional[str] = None,
    end_date: Optional[str] = None,
    end_time: Optional[str] = None
) -> Dict[str, Any]:
    """
    특정 Lot No.에 대해 수입 구간(ST~END) 사이의 시계열 분석 데이터를 집계하고 품질 규격 합부 판정 결과를 반환합니다.
    """
    try:
        st_date_val = str(st_date) if st_date and not hasattr(st_date, "default") else ""
        st_time_val = str(st_time) if st_time and not hasattr(st_time, "default") else ""
        end_date_val = str(end_date) if end_date and not hasattr(end_date, "default") else ""
        end_time_val = str(end_time) if end_time and not hasattr(end_time, "default") else ""

        # Silo 이력에서 구간 자동 검색 (파라미터가 비어있을 경우)
        if not st_date_val or not end_date_val:
            history = pi_service.get_silo_import_history(days=30)
            for h in history:
                if h.get("lot_no") == lot_no:
                    st_parts = h.get("start_time", "").split(" ")
                    st_date_val = st_parts[0] if len(st_parts) > 0 else ""
                    st_time_val = st_parts[1] if len(st_parts) > 1 else "00:00"

                    end_raw = h.get("end_time", "")
                    if "진행" in end_raw or not end_raw:
                        end_date_val = st_date_val
                        end_time_val = "23:59"
                    else:
                        end_parts = end_raw.split(" ")
                        end_date_val = end_parts[0] if len(end_parts) > 0 else ""
                        end_time_val = end_parts[1] if len(end_parts) > 1 else "23:59"
                    break

        points = gmail_service.fetch_latest_analysis_points()
        if not points:
            raise HTTPException(status_code=404, detail="수집된 공정분석 시계열 데이터가 없습니다.")

        result = process_analyzer.calculate_lot_values(
            lot_no=lot_no,
            st_date=st_date_val or "2026-10-26",
            st_time=st_time_val or "00:00",
            end_date=end_date_val or "2026-10-26",
            end_time=end_time_val or "23:59",
            analysis_points=points
        )

        result["st_range"] = f"{st_date_val} {st_time_val} ~ {end_date_val} {end_time_val}".strip()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lot 분석 집계 오류: {str(e)}")

@router.get("/points")
def get_analysis_points() -> List[Dict[str, Any]]:
    """최근 수집된 공정분석 시계열 원시 데이터 반환"""
    points = gmail_service.fetch_latest_analysis_points()
    # datetime 객체 문자열 변환
    clean_points = []
    for p in points:
        cp = dict(p)
        if isinstance(cp.get("datetime"), Any):
            cp["datetime"] = str(cp["datetime"])
        clean_points.append(cp)
    return clean_points

@router.post("/sync-gmail")
def sync_gmail_mails() -> Dict[str, Any]:
    """Gmail API를 통한 최신 분석 메일 수동 동기화 트리거"""
    points = gmail_service.fetch_latest_analysis_points(force_refresh=True)
    return {
        "status": "ok",
        "synced_count": len(points),
        "message": f"공정분석 데이터 {len(points)}건 동기화 완료"
    }
