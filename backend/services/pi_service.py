import logging
import datetime
import urllib3
import requests
from typing import Dict, Any, List, Optional
from zoneinfo import ZoneInfo
from backend.config.settings import settings
from backend.services.lot_service import generate_silo_lot_no

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger("PI-SERVICE")
logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s")

KST = ZoneInfo("Asia/Seoul")
UTC = ZoneInfo("UTC")

class PIService:
    def __init__(self):
        self.auth = (settings.username, settings.password)
        self.base_url = settings.base_url
        self.element_web_id = settings.element_web_id
        self._tag_map: Dict[str, str] = {}
        self._last_map_refresh: Optional[datetime.datetime] = None

    def _ensure_tag_map(self):
        now = datetime.datetime.now()
        if self._tag_map and self._last_map_refresh and (now - self._last_map_refresh).seconds < 600:
            return

        try:
            logger.info("[PI-API] Element 속성 목록(Attribute Map) 갱신 시도...")
            attr_url = f"{self.base_url}/elements/{self.element_web_id}/attributes"
            resp = requests.get(attr_url, auth=self.auth, verify=settings.verify_ssl, timeout=settings.timeout)
            resp.raise_for_status()
            items = resp.json().get("Items", [])
            self._tag_map = {item["Name"].upper(): item["WebId"] for item in items}
            self._last_map_refresh = now
            logger.info(f"[PI-API] Attribute Map 로드 완료: 총 {len(self._tag_map)}개 태그 등록됨")
        except Exception as e:
            logger.error(f"[PI-API-ERR] Attribute Map 로드 실패: {e}", exc_info=True)
            if not self._tag_map:
                raise

    def get_realtime_status(self) -> Dict[str, Any]:
        """
        Silo 3기 및 공급 밸브의 실시간 상태를 조회하고 판정 결과를 반환합니다.
        """
        self._ensure_tag_map()
        
        target_tags = [
            "HV1501A.PV", "HV1501B.PV", "HV1501C.PV", "HV1501D.PV", "HV1501E.PV",
            "HV1501F.PV", "HV1501G.PV", "HV1501H.PV", "HV1501I.PV",
            "HV1602.MV", "UV1602ADO.PV", "UV1602BDO.PV",
            "LI1602AB.PV", "LI1602BB.PV", "LI1602CB.PV"
        ]

        raw_values: Dict[str, Any] = {}
        tag_details: Dict[str, Any] = {}
        
        for tag in target_tags:
            wid = self._tag_map.get(tag)
            if not wid:
                continue
            try:
                url = f"{self.base_url}/streams/{wid}/value"
                r = requests.get(url, auth=self.auth, verify=settings.verify_ssl, timeout=5)
                if r.status_code == 200:
                    d = r.json()
                    val = d.get("Value")
                    ts = d.get("Timestamp")
                    good = d.get("Good", True)
                    
                    # Convert UTC ts to KST
                    kst_str = ""
                    if ts:
                        try:
                            clean_ts = ts.rstrip("Z")
                            if "." in clean_ts:
                                dt_part, frac = clean_ts.split(".", 1)
                                frac = frac[:6]
                                dt_utc = datetime.datetime.strptime(f"{dt_part}.{frac}", "%Y-%m-%dT%H:%M:%S.%f").replace(tzinfo=UTC)
                            else:
                                dt_utc = datetime.datetime.strptime(clean_ts, "%Y-%m-%dT%H:%M:%S").replace(tzinfo=UTC)
                            dt_kst = dt_utc.astimezone(KST)
                            kst_str = dt_kst.strftime("%Y-%m-%d %H:%M:%S")
                        except Exception:
                            kst_str = ts

                    raw_values[tag] = val
                    tag_details[tag] = {
                        "value": val,
                        "timestamp_kst": kst_str,
                        "good": good
                    }
            except Exception as e:
                logger.warning(f"[PI-API-WARN] 태그 '{tag}' 실시간 값 조회 실패: {e}")

        # 1. Feed 여부 계산 (O4 = SUM(HV1501A~I) / 2)
        hv_keys = [f"HV1501{ch}.PV" for ch in ['A','B','C','D','E','F','G','H','I']]
        hv_vals = []
        for k in hv_keys:
            v = raw_values.get(k, 0)
            if isinstance(v, (int, float)):
                hv_vals.append(float(v))
            else:
                hv_vals.append(0.0)

        sum_hv = sum(hv_vals)
        o4 = sum_hv / 2.0
        is_feeding = o4 > 0
        status_text = "Feed" if is_feeding else "Stop"

        # 2. Silo 수입 방향 판정
        hv1602 = raw_values.get("HV1602.MV", 0)
        uv_a = raw_values.get("UV1602ADO.PV", 0)
        uv_b = raw_values.get("UV1602BDO.PV", 0)

        if not is_feeding:
            target_code = "-"
            incoming_silo = None
            direction_desc = "수입 중단 (Stop)"
        elif hv1602 == 2:
            target_code = "TK-1551"
            incoming_silo = "TK-1551"
            direction_desc = "TK-1551 (버퍼 탱크)"
        elif uv_a == 1:
            target_code = "A"
            incoming_silo = "A"
            direction_desc = "Silo A"
        elif uv_b == 1:
            target_code = "B"
            incoming_silo = "B"
            direction_desc = "Silo B"
        else:
            target_code = "C"
            incoming_silo = "C"
            direction_desc = "Silo C"

        # 3. Silo 레벨 (%)
        def _parse_lvl(tag_name: str) -> float:
            v = raw_values.get(tag_name)
            if isinstance(v, (int, float)):
                return round(float(v), 2)
            return 0.0

        levels = {
            "A": _parse_lvl("LI1602AB.PV"),
            "B": _parse_lvl("LI1602BB.PV"),
            "C": _parse_lvl("LI1602CB.PV")
        }

        # 4. 현재 활성 수입 세션 정보
        history = self.get_silo_import_history(days=14)
        active_session = None
        for s in history:
            if s.get("is_active"):
                active_session = s
                break

        now_kst = datetime.datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S")

        return {
            "server_time_kst": now_kst,
            "is_feeding": is_feeding,
            "status_text": status_text,
            "valve_sum_o4": o4,
            "target_code": target_code,
            "incoming_silo": incoming_silo,
            "direction_desc": direction_desc,
            "levels": levels,
            "active_session": active_session,
            "tag_details": tag_details
        }

    def get_silo_import_history(self, days: int = 14) -> List[Dict[str, Any]]:
        """
        과거 N일간의 방향 전환 밸브 변경 이력을 파싱하여, Silo별 수입 세션(시작~종료 구간 및 Lot No.) 목록을 생성합니다.
        """
        self._ensure_tag_map()
        
        wid_uva = self._tag_map.get("UV1602ADO.PV")
        wid_uvb = self._tag_map.get("UV1602BDO.PV")
        wid_hv1602 = self._tag_map.get("HV1602.MV")

        # 시간대별 밸브 상태 기록 수집
        events = []
        for tag_name, wid in [("UV_A", wid_uva), ("UV_B", wid_uvb), ("HV_1602", wid_hv1602)]:
            if not wid:
                continue
            url = f"{self.base_url}/streams/{wid}/recorded?startTime=*-{days}d&maxCount=1000"
            try:
                r = requests.get(url, auth=self.auth, verify=settings.verify_ssl, timeout=settings.timeout)
                if r.status_code == 200:
                    items = r.json().get("Items", [])
                    for it in items:
                        ts = it.get("Timestamp")
                        val = it.get("Value")
                        if ts is not None and isinstance(val, (int, float)):
                            clean_ts = ts.rstrip("Z")
                            if "." in clean_ts:
                                dt_part, frac = clean_ts.split(".", 1)
                                frac = frac[:6]
                                dt_utc = datetime.datetime.strptime(f"{dt_part}.{frac}", "%Y-%m-%dT%H:%M:%S.%f").replace(tzinfo=UTC)
                            else:
                                dt_utc = datetime.datetime.strptime(clean_ts, "%Y-%m-%dT%H:%M:%S").replace(tzinfo=UTC)
                            events.append({
                                "dt": dt_utc,
                                "tag": tag_name,
                                "value": int(val)
                            })
            except Exception as e:
                logger.warning(f"[PI-API-WARN] 이력 태그 {tag_name} 조회 실패: {e}")

        events.sort(key=lambda x: x["dt"])

        # 타임라인을 따라 상태 머신(State Machine) 시뮬레이션
        curr_state = {"UV_A": 0, "UV_B": 0, "HV_1602": 0}
        
        timeline_transitions = []
        for ev in events:
            curr_state[ev["tag"]] = ev["value"]
            # 방향 결정
            if curr_state["HV_1602"] == 2:
                silo = "TK-1551"
            elif curr_state["UV_A"] == 1:
                silo = "A"
            elif curr_state["UV_B"] == 1:
                silo = "B"
            else:
                silo = "C"
            
            timeline_transitions.append({
                "dt": ev["dt"],
                "silo": silo
            })

        # 연속된 동일 Silo 압축 및 세션 구간(ST ~ END) 생성
        sessions = []
        if not timeline_transitions:
            return sessions

        curr_silo = timeline_transitions[0]["silo"]
        start_dt = timeline_transitions[0]["dt"]

        for i in range(1, len(timeline_transitions)):
            trans = timeline_transitions[i]
            if trans["silo"] != curr_silo:
                # 구간 종료
                end_dt = trans["dt"]
                start_kst = start_dt.astimezone(KST)
                end_kst = end_dt.astimezone(KST)
                duration_sec = int((end_dt - start_dt).total_seconds())
                hours = duration_sec // 3600
                mins = (duration_sec % 3600) // 60

                if curr_silo in ["A", "B", "C"]:
                    lot_no = generate_silo_lot_no(curr_silo, start_kst)
                else:
                    lot_no = "-"

                sessions.append({
                    "silo": curr_silo,
                    "lot_no": lot_no,
                    "start_dt": start_kst,
                    "end_dt": end_kst,
                    "start_time": start_kst.strftime("%Y-%m-%d %H:%M"),
                    "end_time": end_kst.strftime("%Y-%m-%d %H:%M"),
                    "duration_str": f"{hours}시간 {mins}분",
                    "is_active": False
                })

                curr_silo = trans["silo"]
                start_dt = trans["dt"]

        # 현재 진행 중인 마지막 세션
        now_utc = datetime.datetime.now(UTC)
        start_kst = start_dt.astimezone(KST)
        now_kst = now_utc.astimezone(KST)
        duration_sec = int((now_utc - start_dt).total_seconds())
        hours = duration_sec // 3600
        mins = (duration_sec % 3600) // 60

        if curr_silo in ["A", "B", "C"]:
            lot_no = generate_silo_lot_no(curr_silo, start_kst)
        else:
            lot_no = "-"

        sessions.append({
            "silo": curr_silo,
            "lot_no": lot_no,
            "start_dt": start_kst,
            "end_dt": None,
            "start_time": start_kst.strftime("%Y-%m-%d %H:%M"),
            "end_time": "수입 진행 중",
            "duration_str": f"{hours}시간 {mins}분 (진행 중)",
            "is_active": True
        })

        # 최신 세션이 위로 오도록 역순 정렬
        sessions.reverse()
        return sessions

pi_service = PIService()
