from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List
from backend.services.pi_service import pi_service

router = APIRouter(prefix="/api/silos", tags=["Silos"])

@router.get("/status")
def get_silo_status() -> Dict[str, Any]:
    """실시간 Silo 운영 상태 및 레벨, 수입 타깃, 활성 세션 반환"""
    try:
        return pi_service.get_realtime_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PI Server 실시간 상태 조회 실패: {str(e)}")

@router.get("/history")
def get_silo_history(
    days: int = Query(default=14, ge=1, le=90),
    limit: int = Query(default=5, ge=1, le=50)
) -> List[Dict[str, Any]]:
    """과거 수입 세션 이력 (구간 ST~END 및 Lot No.) 최근 N개 반환"""
    try:
        history = pi_service.get_silo_import_history(days=days)
        # JSON 직렬화를 위해 datetime 객체 제거
        clean_history = []
        for h in history[:limit]:
            item = dict(h)
            item.pop("start_dt", None)
            item.pop("end_dt", None)
            clean_history.append(item)
        return clean_history
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"수입 이력 조회 실패: {str(e)}")

@router.get("/tags")
def get_silo_tags() -> Dict[str, Any]:
    """14개 핵심 감시 태그의 원본 값 및 통신 상태 반환"""
    try:
        status = pi_service.get_realtime_status()
        return status.get("tag_details", {})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"태그 상세 조회 실패: {str(e)}")
