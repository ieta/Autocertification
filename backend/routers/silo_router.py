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

@router.get("/latest-by-silo")
def get_latest_by_silo() -> List[Dict[str, Any]]:
    """
    Silo A, Silo B, Silo C 각각에 대해 가장 최신의 대상 Lot 세션 1개씩(총 3개)을 반환합니다.
    (현재 수입 진행 중인 Silo 1개 + 수입 완료된 나머지 Silo 2개)
    """
    try:
        history = pi_service.get_silo_import_history(days=30)
        silos = ['A', 'B', 'C']
        latest_map = {}

        for h in history:
            s_name = h.get("silo")
            if s_name in silos and s_name not in latest_map:
                item = dict(h)
                item.pop("start_dt", None)
                item.pop("end_dt", None)
                latest_map[s_name] = item

        # A, B, C 순서 보장
        result = []
        for s in silos:
            if s in latest_map:
                result.append(latest_map[s])
            else:
                # 이력이 없는 경우 기본 더미 생성
                result.append({
                    "silo": s,
                    "lot_no": "-",
                    "start_time": "-",
                    "end_time": "-",
                    "duration_str": "-",
                    "is_active": False
                })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Silo별 최신 세션 조회 실패: {str(e)}")

@router.get("/history")
def get_silo_history(
    days: int = Query(default=30, ge=1, le=90),
    limit: int = Query(default=50, ge=1, le=100)
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
