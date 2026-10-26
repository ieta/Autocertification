import datetime
from typing import Optional

MONTH_CODES = {
    1: "A", 2: "B", 3: "C", 4: "D", 5: "E", 6: "F",
    7: "G", 8: "H", 9: "I", 10: "J", 11: "K", 12: "L"
}

def generate_silo_lot_no(silo_name: str, start_dt: datetime.datetime) -> str:
    """
    Silo 수입 완료 제품에 대한 Lot No. 생성 규칙:
    구조: YY + SiloCode(A/B/C) + MonthCode(A~L) + DayCode(수입 개시일 DD)
    
    * YY: 수입 개시일(ST Date)의 연도 2자리
    * SiloCode: A, B, C (대문자)
    * MonthCode: 1:A ~ 12:L
    * DayCode: 수입 개시일(ST Date)의 일(Day) 2자리 (01~31)
    """
    silo_code = silo_name.strip().upper()
    if silo_code.startswith("SILO"):
        silo_code = silo_code.replace("SILO", "").strip()
    
    year_code = str(start_dt.year)[-2:]
    month_code = MONTH_CODES.get(start_dt.month, "X")
    day_code = f"{start_dt.day:02d}"
    
    return f"{year_code}{silo_code}{month_code}{day_code}"
