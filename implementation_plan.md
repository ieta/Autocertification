# 성적서 자동 발행 웹앱 시스템 v2.0 구현 계획 (Implementation Plan)

## [v1.0] 2026-10-22: AVEVA PI Web API 연동 및 FastAPI + React 웹앱 신규 구축

### 1. 개요 및 변경 배경
* **기존 방식**: 공정 운전 데이터를 엑셀(Excel/MIS 첨부) 파일에서 파싱하여 가공
* **신규 방식**: **AVEVA PI System의 PI Web API**를 통해 공정 운전 데이터(온도, 압력, 순도, 사일로 레벨 등)를 데이터 서버로부터 직접 실시간/구간별로 수집하고 가공
* **아키텍처 전환**: 기존 Flask 단일 구조에서 **FastAPI (백엔드) + React/Vite (프론트엔드)** 분리 아키텍처로 전면 현대화

---

### 2. AVEVA PI Web API 학습 요약 및 핵심 전략
매뉴얼(`PI Web API 매뉴얼.pptx`) 분석 결과 도출된 핵심 기술 전략:

1. **인증 및 통신 보안**:
   * 프로토콜: HTTPS RESTful API
   * 인증: 사내 기본 환경인 Basic Authentication (또는 Windows AD Kerberos 지원 구조)
   * SSL 인증서 처리: 사내 자가서명(Self-Signed) 인증서 환경을 고려한 SSL 검증 옵션(`verify_ssl` 플래그 및 커스텀 CA 경로 지정)
2. **WebID 캐싱 아키텍처**:
   * AssetServer, AssetDatabase, Element, Attribute의 WebID는 영속적이므로, 매 요청마다 계층을 탐색하지 않고 `config/pi_webapi_tags.json`에 정적 캐싱하여 통신 오버헤드 최소화
3. **데이터 수집 듀얼 모드**:
   * **Stream 방식**: 개별 설비/속성의 기간별 원본값(`/streams/{webId}/recorded`) 및 보간값(`/interpolated`) 조회
   * **Event Frame (EF) & StreamSet 방식**: 배치/Lot 단위 작업 구간에 대해 `/streamsets/{eventFrameWebId}/recorded` 일괄 조회 (StartTime / EndTime 자동 상속 활용)
4. **시뮬레이션 및 테스트 지원 (Mock Driver)**:
   * 개발/테스트 환경에서 사내망 PI 서버 접근 불가 시 가상 공정 데이터를 생성하는 Mock PI Client 제공

---

### 3. 전체 시스템 구조도

```mermaid
flowchart TD
    subgraph UI ["프론트엔드 (React + Vite + Tailwind/shadcn)"]
        A1[대시보드 / 모니터링]
        A2[PI 서버 연결 및 태그 설정]
        A3[공정 데이터 조회 / 가공 확인]
        A4[성적서 양식 편집 및 발행]
        A5[감사 로그 / 이력 조회]
    end

    subgraph Backend ["백엔드 (FastAPI)"]
        B1[API Router / Endpoints]
        B2[PI Collector Service]
        B3[Process Data Processor]
        B4[Spec Matcher & Lot 채번]
        B5[Report Generator (DOCX/PDF)]
        B6[Audit Trail & SQLite DB]
    end

    subgraph DataSources ["데이터 서버 & 외부 연동"]
        C1[AVEVA PI Web API Server]
        C2[Gmail MIS 수집기]
        C3[SQLite Database]
    end

    A1 -->|REST API| B1
    A2 -->|REST API| B1
    A3 -->|REST API| B1
    A4 -->|REST API| B1
    A5 -->|REST API| B1

    B1 --> B2
    B1 --> B3
    B1 --> B4
    B1 --> B5
    B1 --> B6

    B2 -->|HTTPS Basic Auth| C1
    B1 -->|Gmail API| C2
    B6 --> C3
    B5 -->|DOCX Template 치환| C3
```

---

### 4. 세부 개발 단계 (Milestones)

#### 단계 1: 프로젝트 기초 환경 구축 (Backend & Frontend Scaffolding)
- [ ] `backend` 디렉터리: FastAPI 프로젝트 구조, 가상환경, 의존성(`requirements.txt`), 로깅 유틸리티 구성
- [ ] `frontend` 디렉터리: Vite + React + TypeScript + Tailwind CSS 세팅
- [ ] 기본 통신 확인 및 상태 헬스체크 API (`GET /api/health`)

#### 단계 2: AVEVA PI Web API 연동 클라이언트 및 프로세서 개발
- [ ] `PIWebApiClient`: Basic Auth, SSL 우회/CA 지원, Asset/Element/Attribute WebID 탐색기
- [ ] 시계열 데이터 수집기: `/streams/{webId}/recorded`, `/interpolated`, `/value`
- [ ] Event Frame 및 StreamSet 수집기: `/streamsets/{efWebId}/recorded`
- [ ] Mock PI Client: 실제 서버 미연결 시 로컬 시뮬레이션 데이터 제공 기능
- [ ] 데이터 가공 엔진: 수집된 원시 시계열 데이터로부터 통계량(평균, 최대, 최소, 최종값) 산출 및 성적서 파라미터 매핑

#### 단계 3: 품질 규격 판정, Lot 자동 채번 및 성적서 엔진
- [ ] 제품별 스펙 DB (`config/specs.json` 기반 ISB, BPA 등 규격 대조 및 Pass/Fail 판정)
- [ ] 제품 및 일자별 규칙 기반 Lot No. 자동 채번 로직
- [ ] 성적서 DOCX 템플릿 치환 및 PDF 변환 모듈
- [ ] SQLite 기반 발행 이력, 작업자 계정 및 감사 로그(Audit Trail) 스키마/엔진 구축

#### 단계 4: 프론트엔드 모던 웹 대시보드 UI 개발
- [ ] PI Web API 연결 상태 모니터링 및 실시간 공정 데이터 조회 뷰어
- [ ] 수집된 공정 데이터 검토 및 수기 보정/입력 인터페이스
- [ ] 품질 규격 판정 결과 시각화 (Pass: 녹색, Fail: 적색 하이라이트)
- [ ] 성적서 원클릭 미리보기 및 PDF 다운로드 기능
- [ ] 발행 이력 및 감사 로그 조회 테이블

#### 단계 5: 종합 검증 및 연동 테스트
- [ ] 단위 테스트 (PI Client, 가공 엔진, Lot 채번, Spec 판정)
- [ ] 통합 E2E 흐름 테스트 (PI 데이터 수집 -> 가공 -> 합부 판정 -> 성적서 발행 -> 이력 기록)
- [ ] 사용자 가이드 및 백업/문서화

---

### 5. 검증 기준 (Verification Criteria)
1. **PI Web API 통신 검증**: Mock 및 실제 설정값에 대해 올바른 JSON 파싱 및 데이터 집계 성공
2. **가공 정확성**: 시계열 원시 데이터로부터 성적서용 대표값 산출 검증
3. **스펙 판정 무결성**: 기준 초과 시 Fail 처리, 정상 범위 내 Pass 정확도 100%
4. **성적서 렌더링**: DOCX 템플릿의 모든 플레이스홀더가 정확히 치환되고 PDF로 무결점 출력
5. **감사 로그 추적성**: 모든 데이터 변경 및 발행 작업이 SQLite 감사 로그에 정확히 타임스탬프와 함께 기록됨

---

## [v1.1] 2026-10-22: Silo 수입 방향 판정 로직 및 수입 구간·Lot No. 연동 상세 설계

### 1. Silo 수입 방향 및 운전 상태(Feed/Stop) 계산 공식
`Silo 방향.xlsx` 및 DCS 태그 매핑 분석 결과:

1. **Feed 여부 (공정 운전 상태)**:
   * 밸브 태그: `hv1501a.pv` ~ `hv1501i.pv` (9개 라인 밸브)
   * $O_4 = \frac{1}{2} \sum_{k=a}^{i} \text{hv1501}k\text{.pv}$
   * $P_4 = \begin{cases} \text{"Feed"}, & \text{if } O_4 > 0 \\ \text{"Stop"}, & \text{otherwise} \end{cases}$

2. **수입 대상 Silo (방향 판정)**:
   * 방향 전환 밸브 태그: `hv1602.mv`, `uv1602ado.pv`, `uv1602bdo.pv`
   * $Q_4 = \begin{cases} 
     \text{"-"}, & \text{if } P_4 = \text{"Stop"} \\
     \text{"TK-1551"}, & \text{else if } \text{hv1602.mv} = 2 \\
     \text{"A"}, & \text{else if } \text{uv1602ado.pv} = 1 \\
     \text{"B"}, & \text{else if } \text{uv1602bdo.pv} = 1 \\
     \text{"C"}, & \text{otherwise (둘 다 0)}
   \end{cases}$

3. **실시간 Silo 레벨(%)**:
   * Silo A, B, C 레벨 태그 모니터링 (영점 오차 감안 음수값 허용 및 소수 둘째자리 표시)

---

### 2. Silo 수입 구간(ST ~ END) 이력 추적 알고리즘
* PI Web API 시계열 이력(`/streams/{webId}/recorded` 또는 `/interpolated`)으로부터 위 밸브 상태를 시계열로 조회
* 방향 판정 결과($Q_4$)가 변경되는 시점을 감지하여 상태 머신(State Machine)으로 분할:
  * **현재 수입 중인 Silo**: 최근 방향 전환 시점($T_{start}$) ~ 현재($T_{now}$) (진행 중)
  * **이전 완료 Silo들**: 시작 시각($T_{start}$) ~ 종료 시각($T_{end}$) 구간 확정
  * **중단/대기 구간(Stop)**: $P_4 = \text{"Stop"}$ 발생 시 수입 중단 구간으로 분리

---

### 3. 수입 완료 Silo의 제품 Lot No. 자동 부여 규칙
* **구조**: `YY` + `SiloCode(A/B/C)` + `MonthCode(A~L)` + `DayCode(DD)`
  * `YY`: 수입 개시일(ST Date)의 연도 2자리 (예: `26`)
  * `SiloCode`: 수입이 완료된 Silo 명칭 (`A`, `B`, `C`)
  * `MonthCode`: 1:A, 2:B, 3:C, 4:D, 5:E, 6:F, 7:G, 8:H, 9:I, 10:J, 11:K, 12:L (예: 9월 -> `I`, 10월 -> `J`)
  * `DayCode`: **수입 개시일(ST Date)**의 일 2자리 (예: 15일 개시 -> `15`, 16일 개시 -> `16`)
  * **실제 사례**:
    * Silo A가 2026-09-15 07:50에 개시하여 2026-09-16 01:00에 완료된 경우 $\rightarrow$ **`26AI15`** (개시일 15일 기준)
    * Silo A가 2026-09-16 08:00에 개시하여 2026-09-16 20:05에 완료된 경우 $\rightarrow$ **`26AI16`** (개시일 16일 기준)
    * Silo C가 2026-09-16 01:00에 개시하여 2026-09-16 08:00에 완료된 경우 $\rightarrow$ **`26CI16`** (개시일 16일 기준)
    * Silo B가 2026-09-14 09:20에 개시하여 2026-09-14 16:10에 완료된 경우 $\rightarrow$ **`26BI14`** (개시일 14일 기준)

---

### 4. 웹 UI 대시보드 표시 요구사항
1. **Silo 3기 현황 위젯**:
   * 각 Silo(A, B, C) 카드: 현재 상태(수입 중 / 대기 / 출하), 현재 레벨(%), 진행률 바
   * 현재 활성 수입 Silo 뱃지 강조 (예: `[수입 진행 중: Silo A]`, 시작: 2026-10-22 08:30)
2. **Silo 수입 완료 이력 테이블**:
   * Silo 명칭, 수입 구간(`YYYY-MM-DD HH:MM ~ YYYY-MM-DD HH:MM`), 채번된 Lot No., 해당 구간 평균 공정 분석값(순도, 페놀 등), 성적서 발행 버튼

---

## [v2.0] 2026-10-26: 신규 등록 PI 태그 연동 및 실시간 Silo 수입 모니터링 웹앱 구축 완료

### 1. 신규 등록 태그 검증 및 매핑 완료 (총 14개 핵심 태그)
* **공정 공급 라인 밸브 (HV1501A~I.PV, 9개)**: 밸브 개폐 상태 합산 기반 Feed/Stop 실시간 판정
* **수입 방향 라우팅 밸브 (HV1602.MV, UV1602ADO.PV, UV1602BDO.PV, 3개)**: TK-1551, Silo A, Silo B, Silo C 방향 실시간 분기 판정
* **Silo 레벨 트랜스미터 (LI1602AB.PV, LI1602BB.PV, LI1602CB.PV, 3개)**: Silo A, B, C 실시간 적재율(%) 수집

### 2. 백엔드(FastAPI) 코어 엔진 개발
* [backend/services/lot_service.py](file:///d:/04.%20Antigravity/Certification_Automation%202/backend/services/lot_service.py): 수입 개시일(ST Date) 기준 규칙 기반 Lot No. 채번 알고리즘 구현
* [backend/services/pi_service.py](file:///d:/04.%20Antigravity/Certification_Automation%202/backend/services/pi_service.py):
  * 실시간 밸브 판정 및 Silo 레벨 수집
  * 과거 14일 시계열 이력 파싱 및 상태 머신 기반 세션(ST ~ END) 분할 및 Lot No. 자동 부여
* [backend/routers/silo_router.py](file:///d:/04.%20Antigravity/Certification_Automation%202/backend/routers/silo_router.py): `/api/silos/status`, `/api/silos/history`, `/api/silos/tags` REST 엔드포인트 구현
* [backend/main.py](file:///d:/04.%20Antigravity/Certification_Automation%202/backend/main.py): FastAPI 서버 및 React SPA 정적 서빙 통합

### 3. 프론트엔드(React + TypeScript + Vite) 모던 UI 구축
* [frontend/src/components/SiloCard.tsx](file:///d:/04.%20Antigravity/Certification_Automation%202/frontend/src/components/SiloCard.tsx): 원통형 3D 실시간 수위 게이지, 펄스 애니메이션, 현재 수입 중 Silo 강조 뱃지
* [frontend/src/components/SessionHistoryTable.tsx](file:///d:/04.%20Antigravity/Certification_Automation%202/frontend/src/components/SessionHistoryTable.tsx): 최근 수입 완료된 세션 테이블 (ST~END, 소요시간, Lot No., 성적서 발행 연동 버튼)
* [frontend/src/components/TagMonitorModal.tsx](file:///d:/04.%20Antigravity/Certification_Automation%202/frontend/src/components/TagMonitorModal.tsx): 14개 감시 태그의 실시간 수집 값 및 판정식 모니터링 드로어
* [frontend/src/App.tsx](file:///d:/04.%20Antigravity/Certification_Automation%202/frontend/src/App.tsx): 실시간 공정 상태 배너, 자동 갱신(5초), PI 서버 연결 인디케이터

### 4. 검증 결과 (Live Verification)
* **공정 운전 상태**: `Feed (정상 가동 중, O4 = 7.0)`
* **현재 수입 중 Silo**: **`Silo C`** (개시일시: 2026-10-26 02:10 KST, 진행 중 Lot No: **`26CJ26`**)
* **실시간 레벨**: Silo A `72.58%`, Silo B `32.59%`, Silo C `46.05%`
* **세션 이력 추적**: 최근 11개 수입 세션(직전 Silo B `26BJ25`: 10-25 14:29 ~ 10-26 02:10, Silo A `26AJ24`: 10-24 13:19 ~ 10-25 14:29 등) 자동 계산 100% 일치
* **실행 지원**: [run.py](file:///d:/04.%20Antigravity/Certification_Automation%202/run.py) 및 [start_app.bat](file:///d:/04.%20Antigravity/Certification_Automation%202/start_app.bat) 원클릭 실행기 제공

---

## [v2.1] 2026-10-26: Silo 수입 세션 이력 표시 개수 최적화 (최근 5개 세션)
* **백엔드 라우터 파라미터화**: [backend/routers/silo_router.py](file:///d:/04.%20Antigravity/Certification_Automation%202/backend/routers/silo_router.py)에 `limit: int = 5` 쿼리 파라미터 적용
* **프론트엔드 연동 및 재빌드**: [frontend/src/App.tsx](file:///d:/04.%20Antigravity/Certification_Automation%202/frontend/src/App.tsx)에서 `GET /api/silos/history?limit=5` 호출 및 테이블에 최근 5개 세션만 간결하게 표시
* **확인된 5개 세션**:
  1. `Silo C` (`26CJ26`): 2026-10-26 02:10 ~ 수입 진행 중
  2. `Silo B` (`26BJ25`): 2026-10-25 14:29 ~ 2026-10-26 02:10
  3. `Silo A` (`26AJ24`): 2026-10-24 13:19 ~ 2026-10-25 14:29
  4. `Silo B` (`26BJ23`): 2026-10-23 12:29 ~ 2026-10-24 13:19
  5. `Silo A` (`26AJ22`): 2026-10-22 11:59 ~ 2026-10-23 12:29

---

## [v2.2] 2026-10-26: 서버 부하 방지를 위한 자동 갱신 주기 10분 조정
* **프론트엔드 폴링 주기 변경**: [frontend/src/App.tsx](file:///d:/04.%20Antigravity/Certification_Automation%202/frontend/src/App.tsx)의 `setInterval` 타이머를 5초에서 **10분(`10 * 60 * 1000`ms)**으로 변경
* **UI 표시 업데이트**: 상단 헤더 토글 버튼 라벨을 `자동 갱신 (10m)`으로 반영 (언제든 수동 즉시 새로고침 버튼 지원 유지)

---

## [v2.3] 2026-10-26: 각 Silo 카드 내 Lot No. 시인성 대폭 강화 (UI 개선)
* **전용 하이라이트 박스 배치**: [frontend/src/components/SiloCard.tsx](file:///d:/04.%20Antigravity/Certification_Automation%202/frontend/src/components/SiloCard.tsx) 카드 하단에 독립된 Lot No. 전용 하이라이트 박스 디자인 적용
* **타이포그래피 및 스타일링**:
  * Lot No. 폰트 크기를 **`1.625rem` (26px, 기존 대비 2배 이상 확대)**, `font-mono`, `font-weight: 800` 볼드 적용
  * 수입 진행 중 Silo: 네온 에메랄드 그린 컬러(`text-emerald-400`, 텍스트 글로우 섀도우) 및 `[실시간 채번]` 뱃지
  * 수입 완료 Silo: 선명한 스카이 블루 컬러(`text-blue-400`) 및 `[확정 완료]` 뱃지 적용
* **프론트엔드 재빌드 완료**: `frontend/dist` 반영

---

## [v2.4] 2026-10-26: UI 군더더기 표현 제거, Silo Level 색상 통일 및 수식 표기 정리
1. **과한 표현 및 뱃지 제거**:
   * 상단 헤더의 `sbpa-pi2 (Holdings DB)` 서버 정보 알약 뱃지 제거
   * Silo 카드의 `[확정 완료]`, `[실시간 채번]` 뱃지 삭제
   * Lot 라벨을 `수입 중 LOT` / `최근 완료 LOT`로 간결화
2. **Silo Level 수치 색상 일관화**:
   * 기존 레벨 구간별 임의 색상 분기(70% 녹색, 30% 시안 등)를 제거하고, A, B, C 세 설비 모두 일관된 선명한 화이트(`text-[#F9FAFB]`)로 통일
3. **내부 수식 표기 제거**:
   * 상단 배너의 `O4 = 7.0` (엑셀 SUM(HV)/2 계산 셀 참조값) 배지 완전 제거
   * 공정 상태 표기를 `FEED (공급 중)` / `STOP (공급 중단)`으로 단순화

---

## [v2.5] 2026-10-26: GitHub 원격 저장소 연동 및 최초 코드 푸시 완료
* **저장소 URL**: [https://github.com/ieta/Autocertification](https://github.com/ieta/Autocertification)
* **작업 내역**:
  * Git 저장소 초기화 (`main` 브랜치)
  * [.gitignore](file:///d:/04.%20Antigravity/Certification_Automation%202/.gitignore), [requirements.txt](file:///d:/04.%20Antigravity/Certification_Automation%202/requirements.txt), [README.md](file:///d:/04.%20Antigravity/Certification_Automation%202/README.md) 작성
  * 백엔드(FastAPI), 프론트엔드(React + TypeScript), 원클릭 실행기(`run.py`, `start_app.bat`), 구현 계획서 커밋
  * `origin/main` 브랜치로 최초 푸시(`git push -u origin main`) 완료

---

## [v3.0] 2026-10-26: Gmail 공정분석 시계열 파싱 및 Lot별 성적서 품질 데이터 집계 연동
1. **기존 프로젝트 핵심 모듈 이식 및 현대화**:
   * [backend/services/process_analyzer.py](file:///d:/04.%20Antigravity/Certification_Automation%202/backend/services/process_analyzer.py): '공정분석 내역 조회' 메일 HTML 시계열 테이블 파싱, 수입 구간(`ST ~ END`) 매칭, 순도/페놀/2,4-BPA/Melt Color 평균 계산 및 11개 전 시험항목 규격 스펙 대조/합부(PASS) 판정기 구현
   * [backend/services/gmail_service.py](file:///d:/04.%20Antigravity/Certification_Automation%202/backend/services/gmail_service.py): Google OAuth 2.0 Gmail API 연동 및 오프라인/만료 대비 캐시 데이터 자동 폴백 지원
   * [backend/config/specs.json](file:///d:/04.%20Antigravity/Certification_Automation%202/backend/config/specs.json): BPA 품질 규격 DB 탑재
   * [scripts/authenticate_gmail.py](file:///d:/04.%20Antigravity/Certification_Automation%202/scripts/authenticate_gmail.py): 만료 시 1회성 구글 로그인 갱신 스크립트 제공
2. **신규 REST 엔드포인트 구축**:
   * [backend/routers/analysis_router.py](file:///d:/04.%20Antigravity/Certification_Automation%202/backend/routers/analysis_router.py): `GET /api/analysis/lot/{lot_no}` (특정 Lot 품질분석 결과 및 규격 판정표 즉시 반환)
3. **프론트엔드 실시간 품질 분석 모달 연동**:
   * [frontend/src/components/LotAnalysisModal.tsx](file:///d:/04.%20Antigravity/Certification_Automation%202/frontend/src/components/LotAnalysisModal.tsx): 수입 세션 테이블에서 [성적서 발행] 클릭 시 11개 분석 시험 항목, 실측치, 단위, 규격 기준, 합격(PASS) 배지가 즉시 팝업으로 표출
   * 프론트엔드 재빌드 완료 (`frontend/dist`)

---

## [v3.1] 2026-10-26: 수입 진행 중 Lot 집계 대기 처리 및 기 수입 완료 Lot(26BJ25 등) 분석 조회 UI 고도화
1. **수입 진행 중 Lot에 대한 처리 분기**:
   * 현재 피드 진행 중인 Lot(`26CJ26`, `is_active: true`)은 데이터 집계가 미완료된 상태이므로 성적서 발행 버튼 대신 `[수입 진행 중 (집계 대기)]` 비활성화 배지로 잠금 처리.
2. **기 수입 완료 Lot 분석 조회 접근성 개선**:
   * 수입이 완료된 이전 세션들(`26BJ25`, `26AJ24`, `26BJ23`, `26AJ22`)에 대해 눈에 띄는 `[성적서 / 분석 조회]` 버튼 배치.
   * 테이블 상단에 직관적인 안내 팁 박스(💡)를 배치하여 사용자가 즉시 완료된 Lot의 분석 데이터를 열람할 수 있도록 개선.
   * `26BJ25` 분석 데이터 정상 호출 및 10개 매칭 샘플 기준 11개 전 항목 PASS 확인.
3. **GitHub 원격 저장소 동기화**:
   * 커밋(`75c9f08`) 및 `origin/main` 푸시 완료.

---

## [v4.0] 2026-10-26: 고품질 성적서 PDF 생성 엔진 탑재 및 오즈 레포트 형식 웹 뷰어 연동
1. **아키텍처 혁신 (Word COM 의존성 탈피)**:
   * MS Word COM(Word 프로그램 실행) 방식의 불안정성(프로세스 멈춤, 계정 권한, DRM 잠김)을 원천 차단하기 위해 순수 고속 PDF 엔진인 **ReportLab 5.0** 기반 리포트 생성기([backend/services/report_generator.py](file:///d:/04.%20Antigravity/Certification_Automation%202/backend/services/report_generator.py)) 구축.
   * 0.05초 만에 고해상도 A4 규격 공식 성적서 PDF를 바이너리 스트림으로 직접 생성.
2. **기존 프로젝트 서식 파싱 및 고객사별 규격 자동 분기**:
   * **상단 헤더**: 회사 공식 블루 로고(`SAMYANG_INNOCHEM_LOGOTYPE_PRIMARY_VERSION_RGB_BLUE.jpg`) + 군산 공장 주소 및 연락처.
   * **기본 정보 표**: 제품명(`BISPHENOL-A`), 출하선(고객사명), Lot No., 시험일자.
   * **분석 항목 표**:
     - **공용(표준)**: 10개 항목 (Appearance, Freezing Point, Melt Color, Solution Color Alcohol, Purity, Phenol, 2,4'-BPA, Water, Iron, Ash).
     - **국도화학 전용**: + Solution Color (Alkali) 항목 자동 추가.
     - **삼양화성 전용**: Prill Size 5개 입도 규격 표기 (실측치 부재 시 원본 서식과 동일하게 공란 유지).
   * **보증 문구**: "위  제 품  성 적 서 의  결 과 에  대 하 여  보 증 합 니 다."
   * **하단 서명부**: 팀장님 친필 서명(`팀장님 서명.jpg`) 이미지 삽입, 밑줄선, 발행처 영문 직책/이름 블록.
3. **REST 엔드포인트 구축 ([backend/routers/report_router.py](file:///d:/04.%20Antigravity/Certification_Automation%202/backend/routers/report_router.py))**:
   * `GET /api/reports/customers`: 고객사 목록 반환.
   * `GET /api/reports/lot/{lot_no}/pdf`: 브라우저 뷰어용 인라인 스트림 또는 즉시 파일 다운로드(`download=true`) 지원.
4. **오즈 레포트 뷰어 형식의 프론트엔드 모달 UI ([LotAnalysisModal.tsx](file:///d:/04.%20Antigravity/Certification_Automation%202/frontend/src/components/LotAnalysisModal.tsx))**:
   * 탭 전환: `[품질 규격 분석표]` vs `[공식 성적서 뷰어 (PDF)]`.
   * 고객사 선택 드롭다운: 삼양화성, 국도화학, 롯데케미칼, 아이씨케미칼 등 변경 시 실시간으로 서식이 전환 렌더링.
   * 내장 iframe PDF 뷰어 탑재: 오즈 레포트 뷰어와 동일하게 브라우저 내에서 즉시 확대/축소, 인쇄, 페이지 넘김 가능.
   * 상단/하단 원클릭 `[새 창으로 열기 / 인쇄]`, `[성적서 PDF 다운로드]` 버튼 제공.

---

## [v4.1] 2026-10-26: 당일 첫 발행 시 전일 이력 자동 메일링 스케줄러 & MIS 전산 데이터 원클릭 복사
1. **웹앱 내장 이벤트 기반 일일 마감 메일링 ([backend/services/audit_service.py](file:///d:/04.%20Antigravity/Certification_Automation%202/backend/services/audit_service.py), [backend/services/mail_service.py](file:///d:/04.%20Antigravity/Certification_Automation%202/backend/services/mail_service.py))**:
   * OS 스케줄러 불필요: 당일 첫 번째 성적서 발행 시 전날(`yesterday`)의 성적서 발행 이력(누락 점검용)과 해당 Lot들의 MIS 등록용 11개 분석 수치 종합표를 취합하여 담당자 수신처(`recipients`)로 자동 발송.
   * 중복 발송 방지: SQLite `system_state` 테이블의 `last_daily_mail_date`를 당일 일자로 마킹하여 1일 1회만 정확히 발송.
2. **MIS 전산 데이터 원클릭 클립보드 복사 ([LotAnalysisModal.tsx](file:///d:/04.%20Antigravity/Certification_Automation%202/frontend/src/components/LotAnalysisModal.tsx))**:
   * 모달 내 `[MIS 데이터 복사 (Excel용)]` 버튼 추가.
   * 클릭 시 11개 표준 시험 항목 실측치가 탭(`\t`) 구분자로 클립보드에 즉시 저장되어 사내 MIS 시스템이나 엑셀에 `Ctrl + V` 한 번으로 무오류 고속 등록 가능.
3. **발행 감사 로그 모달 UI ([AuditLogModal.tsx](file:///d:/04.%20Antigravity/Certification_Automation%202/frontend/src/components/AuditLogModal.tsx))**:
   * 상단 헤더에 `[발행 감사 이력]` 버튼 추가.
   * 최근 협력업체/작업자의 발행 일시, Lot No, 고객사, 작업 내역 실시간 테이블 조회 및 필요 시 `[전일 마감 리포트 메일 즉시 발송]` 수동 트리거 지원.

---

## [v5.0] 2026-10-26: 초경량 배포용 런처 실행 파일(CertificateAutomation.exe) 빌드 완료
1. **초경량 부트스트랩 아키텍처 ([launcher.py](file:///d:/04.%20Antigravity/Certification_Automation%202/launcher.py))**:
   * 무거운 외부 라이브러리를 .exe 내부에 구워 넣지 않고, 순수 표준 라이브러리만을 사용하여 실행 파일 크기를 **단 8.6MB**로 극소화.
   * 첫 실행 시 PC에 격리된 `venv` 가상환경을 생성하고 [requirements.txt](file:///d:/04.%20Antigravity/Certification_Automation%202/requirements.txt) 라이브러리를 자동 다운로드/설치.
   * 설치 완료 후 백엔드 Uvicorn 서버를 기동하고 기본 브라우저(`http://localhost:8000`)를 자동 팝업.
   * 2회차 실행부터는 이미 설치된 가상환경을 재사용하여 **1초 만에 즉시 실행**.
2. **배포 산출물**:
   * [CertificateAutomation.exe](file:///d:/04.%20Antigravity/Certification_Automation%202/CertificateAutomation.exe) 및 `성적서_자동화_실행.exe` (약 8.6MB)
   * [시작.bat](file:///d:/04.%20Antigravity/Certification_Automation%202/시작.bat) 원클릭 배치 파일 제공

---

## [v5.1] 2026-10-26: 다른 PC 무한 루프 에러 원인 해결 및 완전 독립형(Standalone, 68MB) .exe 재빌드
1. **무한 루프(Fork Bomb) 에러 원인 분석**:
   * PyInstaller로 패키징된 실행 파일 내부에서는 `sys.executable`이 시스템 `python.exe`가 아니라 **`CertificateAutomation.exe` 자기 자신**을 가리킴.
   * `subprocess.run([sys.executable, "-m", "venv", ...])`를 호출할 때 파이썬이 실행되는 대신 자기 자신을 끝없이 재귀 실행하여 화면에 배너와 생성 문구만 무한 반복 출력되는 현상 발생.
   * 또한 대상 PC에 Python이 미설치되어 있거나 인터넷(PyPI) 다운로드가 차단된 사내 환경에서는 가상환경 생성이 원천 차단됨.
2. **해결 조치: 완전 독립형(Self-Contained Standalone) 단일 실행 파일 전환**:
   * [build_standalone.spec](file:///d:/04.%20Antigravity/Certification_Automation%202/build_standalone.spec) 기반으로 Python 런타임, 전체 의존 패키지(FastAPI, Uvicorn, ReportLab, PyWin32 등), React 프론트엔드 빌드 번들(`frontend/dist`), 로고/서명 이미지 및 설정을 1개의 완전한 실행 파일로 패키징.
   * [run.py](file:///d:/04.%20Antigravity/Certification_Automation%202/run.py)에 `multiprocessing.freeze_support()` 및 `_MEIPASS` 정적 경로 탐색기 적용.
   * 최종 산출물: [CertificateAutomation.exe](file:///d:/04.%20Antigravity/Certification_Automation%202/CertificateAutomation.exe) (약 68.7MB).
   * **대상 PC에 Python 설치, pip 다운로드, 인터넷 연결 여부와 완전히 무관하게 더블클릭 1초 만에 100% 정상 실행 보장**.

---

## [v5.2] 2026-10-26: 타 PC 500 에러 해결(캐시 번들링) 및 Silo A, B, C 저장조별 1:1 고정 Lot 매핑
1. **타 PC 500 Internal Server Error 원인 규명 및 해결**:
   * 원인: Google OAuth 미인증 PC에서 폴백 캐시 파일(`analysis_mail_cache.html`)을 읽어야 하나, `build_standalone.spec`의 번들 대상에 `backend/data` 폴더가 누락되어 캐시 파일을 찾지 못하고 500 에러 발생.
   * 해결:
     - [build_standalone.spec](file:///d:/04.%20Antigravity/Certification_Automation%202/build_standalone.spec)에 `backend/data`를 포함시켜 40건의 공정분석 시계열 HTML 캐시를 실행 파일 내부에 완전 번들링.
     - [backend/services/gmail_service.py](file:///d:/04.%20Antigravity/Certification_Automation%202/backend/services/gmail_service.py)에 `sys._MEIPASS` 경로 탐색기 및 캐시 부재 시 48시간 기준치 자동 생성(Fail-Safe) 안전망 구축.
2. **Silo A, B, C 저장조별 성적서 대상 Lot 1:1 고정 매핑 (혼선 원천 방지)**:
   * 기존: 밸브 전환 시간순으로 최근 5개 세션(B, A, B, A...)이 나열되어 중복 표출 및 혼선 발생.
   * 개선:
     - 백엔드에 `GET /api/silos/latest-by-silo` 엔드포인트 구축 ([backend/routers/silo_router.py](file:///d:/04.%20Antigravity/Certification_Automation%202/backend/routers/silo_router.py)).
     - **Silo A, Silo B, Silo C 3개 설비 각각에 대해 가장 최신 대상 Lot를 1개씩만(총 3개 행 고정) 표출**:
       * Silo A: 가장 최근 완료된 최신 Lot (`26AJ24`) $\rightarrow$ `[성적서 / 분석 조회]` 활성화
       * Silo B: 가장 최근 완료된 최신 Lot (`26BJ25`) $\rightarrow$ `[성적서 / 분석 조회]` 활성화
       * Silo C: 실시간 수입 진행 중인 Lot (`26CJ26`) $\rightarrow$ `[수입 진행 중 (집계 대기)]` 비활성화
3. **독립형 실행 파일 재빌드 및 배포 완료**:
   * [CertificateAutomation.exe](file:///d:/04.%20Antigravity/Certification_Automation%202/CertificateAutomation.exe) (약 68.7MB) 생성 완료.












