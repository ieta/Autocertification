# 제품 성적서 자동화 & Silo 실시간 수입 모니터링 시스템 (Autocertification)

AVEVA PI Web API를 통해 공정 운전 데이터를 실시간으로 직접 수집하고, Silo A/B/C 수입 상태 판정, 수입 구간(ST~END) 추적, 수입 개시일 기준 Lot No. 자동 채번 및 제품 성적서 발행을 지원하는 웹 애플리케이션입니다.

---

## 🌟 주요 기능
1. **AVEVA PI Web API 실시간 연동**:
   * DCS 이송 밸브 9개(`HV1501A~I.PV`) 기반 Feed/Stop 공정 운전 상태 실시간 판정
   * 수입 방향 라우팅 밸브(`HV1602.MV`, `UV1602ADO.PV`, `UV1602BDO.PV`) 기반 Silo A, B, C 실시간 방향 전환 감지
   * 3개 Silo 실시간 적재율(Level, `LI1602AB/BB/CB.PV`) 수집 및 시각화
2. **Silo 수입 세션 이력 추적 및 Lot No. 자동 채번**:
   * 과거 시계열 밸브 전환 이력 분석을 통한 최근 수입 구간(`ST ~ END`) 복원
   * 수입 개시일(ST Date) 기준 규칙 기반 Lot No. 자동 채번 (`YY + Silo + MonthCode + DayCode`)
3. **모던 웹 대시보드 UI**:
   * 원통형 Silo 실시간 수위 게이지, 펄스 애니메이션 및 수입 진행 중 Silo 강조
   * 최근 5개 수입 완료 세션 테이블
   * 14개 감시 태그의 실시간 원본값 및 타임스탬프 확인용 DCS 태그 모니터 드로어
   * 서버 부하 방지를 위한 10분 주기 자동 갱신 및 수동 즉시 갱신 지원

---

## 🏗️ 시스템 아키텍처
* **백엔드**: FastAPI (Python), Uvicorn, Requests, Pydantic
* **프론트엔드**: React, TypeScript, Vite, Tailwind CSS, Lucide Icons

```
Certification_Automation 2/
├── backend/
│   ├── config/             # PI Web API 연결 및 환경설정
│   ├── services/           # PI 연동, 상태 판정, 세션 이력 파싱, Lot 채번 로직
│   ├── routers/            # /api/silos 엔드포인트
│   └── main.py             # FastAPI 메인 엔트리포인트 및 SPA 정적 서빙
├── frontend/               # React + Vite 프론트엔드 소스코드
│   ├── src/components/     # SiloCard, SessionHistoryTable, TagMonitorModal
│   └── dist/               # 최적화 빌드 산출물
├── run.py                  # 통합 실행 스크립트 (브라우저 자동 오픈)
├── start_app.bat           # Windows 원클릭 실행 배치 파일
└── requirements.txt
```

---

## 🚀 빠른 시작

### 1. 의존성 설치
```bash
pip install -r requirements.txt
```

### 2. 애플리케이션 실행
```bash
python run.py
```
* 또는 `start_app.bat` 더블클릭
* 브라우저에서 `http://127.0.0.1:8000` 자동 실행
* API 문서(Swagger): `http://127.0.0.1:8000/docs`
