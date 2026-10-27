import { useState, useEffect } from 'react';
import { SiloCard } from './components/SiloCard';
import { SessionHistoryTable, type ImportSession } from './components/SessionHistoryTable';
import { TagMonitorModal } from './components/TagMonitorModal';
import { LotAnalysisModal, type LotAnalysisData } from './components/LotAnalysisModal';
import { AuditLogModal } from './components/AuditLogModal';
import { LotHistorySearchModal } from './components/LotHistorySearchModal';
import {
  Activity,
  RefreshCw,
  Layers,
  ShieldCheck,
  FileCheck,
  Calendar
} from 'lucide-react';

interface SiloStatus {
  server_time_kst: string;
  is_feeding: boolean;
  status_text: string;
  valve_sum_o4: number;
  target_code: string;
  incoming_silo: string | null;
  direction_desc: string;
  levels: {
    A: number;
    B: number;
    C: number;
  };
  active_session: ImportSession | null;
  tag_details: Record<string, any>;
}

export function App() {
  const [status, setStatus] = useState<SiloStatus | null>(null);
  const [history, setHistory] = useState<ImportSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [isTagModalOpen, setIsTagModalOpen] = useState<boolean>(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [isHistorySearchModalOpen, setIsHistorySearchModalOpen] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Lot Analysis Modal State
  const [selectedLotData, setSelectedLotData] = useState<LotAnalysisData | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState<boolean>(false);
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false);

  const handleOpenLotAnalysis = async (sess: ImportSession) => {
    setIsAnalysisModalOpen(true);
    setAnalysisLoading(true);
    try {
      const res = await fetch(`/api/analysis/lot/${sess.lot_no}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedLotData(data);
      } else {
        alert(`Lot ${sess.lot_no} 분석 데이터 집계 실패: ${res.statusText}`);
        setIsAnalysisModalOpen(false);
      }
    } catch (e) {
      console.error('Failed to load lot analysis:', e);
      alert('분석 데이터 집계 중 오류가 발생했습니다.');
      setIsAnalysisModalOpen(false);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const resStatus = await fetch('/api/silos/status');
      if (resStatus.ok) {
        const dataStatus = await resStatus.json();
        setStatus(dataStatus);
      }

      const resHistory = await fetch('/api/silos/latest-by-silo');
      if (resHistory.ok) {
        const dataHistory = await resHistory.json();
        setHistory(dataHistory);
      }

      setLastUpdated(new Date().toLocaleTimeString('ko-KR'));
    } catch (err) {
      console.error('Failed to fetch Silo data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getLastCompletedLot = (silo: string) => {
    const found = history.find(h => h.silo === silo && !h.is_active);
    return {
      lot_no: found ? found.lot_no : '-',
      end_time: found ? found.end_time : '-'
    };
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Apple Global Nav (Signature pure black with hairline border) */}
      <nav className="apple-global-nav">
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px'
        }}>
          {/* Brand Logo & Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#0066cc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Layers size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="font-display" style={{ fontSize: '1.0625rem', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em' }}>
                  Samyang Innochem QC
                </span>
                <span style={{
                  fontSize: '0.6875rem',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#d2d2d7',
                  fontWeight: 500
                }}>
                  v2.0
                </span>
              </div>
            </div>
          </div>

          {/* Right Nav Utilities */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsTagModalOpen(true)}
              style={{
                background: 'transparent',
                color: '#d2d2d7',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: '6px'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#d2d2d7')}
            >
              <Activity size={14} style={{ color: '#2997ff' }} />
              DCS 태그 모니터
            </button>

            <button
              onClick={() => setIsHistorySearchModalOpen(true)}
              style={{
                background: 'transparent',
                color: '#d2d2d7',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: '6px'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#d2d2d7')}
              title="과거 30일간 완료된 모든 Lot 번호 검색 및 MIS 데이터 복사"
            >
              <Calendar size={14} style={{ color: '#2997ff' }} />
              과거 Lot / MIS 이력
            </button>

            <button
              onClick={() => setIsAuditModalOpen(true)}
              style={{
                background: 'transparent',
                color: '#d2d2d7',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: '6px'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#d2d2d7')}
            >
              <FileCheck size={14} style={{ color: '#30d158' }} />
              발행 감사 이력
            </button>

            <div style={{ width: '1px', height: '16px', background: 'rgba(255, 255, 255, 0.2)', margin: '0 4px' }} />

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              style={{
                background: autoRefresh ? 'rgba(0, 102, 204, 0.3)' : 'transparent',
                color: autoRefresh ? '#2997ff' : '#86868b',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '0.6875rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={11} className={autoRefresh ? 'liquid-wave' : ''} />
              {autoRefresh ? '자동 갱신 중' : '수동 갱신'}
            </button>

            <button
              onClick={fetchData}
              title="새로고침"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#d2d2d7',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'liquid-wave' : ''} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '36px 24px', flex: 1, width: '100%' }}>
        {/* Page Sub-header */}
        <div style={{ marginBottom: '28px' }}>
          <h2 className="font-display" style={{ fontSize: '2rem', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.025em' }}>
            Silo 수입 현황 및 성적서 자동화
          </h2>
          <p style={{ fontSize: '1.0625rem', color: '#86868b', marginTop: '4px', letterSpacing: '-0.015em' }}>
            AVEVA PI Web API 실시간 데이터 연동 및 삼양 품질 분석 성적서
          </p>
        </div>

        {/* 2. Apple Operational Status Banner */}
        {status && (
          <div className="glass-panel" style={{
            padding: '20px 28px',
            marginBottom: '32px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            background: '#ffffff'
          }}>
            {/* Left Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '9999px',
                background: status.is_feeding ? 'rgba(52, 199, 89, 0.12)' : 'rgba(255, 59, 48, 0.12)',
                color: status.is_feeding ? '#28a745' : '#ff3b30',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {status.is_feeding ? <ShieldCheck size={24} /> : <Activity size={24} />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8125rem', color: '#86868b' }}>공정 상태</span>
                  <span className="font-display" style={{
                    fontWeight: 600,
                    fontSize: '1.125rem',
                    color: status.is_feeding ? '#28a745' : '#ff3b30'
                  }}>
                    {status.is_feeding ? 'FEED (공급 중)' : 'STOP (공급 중단)'}
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#1d1d1f', marginTop: '2px', fontWeight: 500 }}>
                  수입 Silo: <strong style={{ color: '#0066cc' }}>{status.direction_desc}</strong>
                </p>
              </div>
            </div>

            {/* Center Status: Active Lot Capsule */}
            {status.active_session && (
              <div style={{
                background: '#f5f5f7',
                border: '1px solid #e5e5ea',
                borderRadius: '9999px',
                padding: '8px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px'
              }}>
                <div>
                  <div style={{ fontSize: '0.6875rem', color: '#86868b', fontWeight: 500 }}>
                    수입 진행 LOT
                  </div>
                  <div className="font-mono" style={{ fontSize: '1.0625rem', fontWeight: 600, color: '#1d1d1f' }}>
                    {status.active_session.lot_no}
                  </div>
                </div>
                <div style={{ height: '24px', width: '1px', background: '#d2d2d7' }} />
                <div>
                  <div style={{ fontSize: '0.6875rem', color: '#86868b', fontWeight: 500 }}>개시 일시</div>
                  <div className="font-mono" style={{ fontSize: '0.8125rem', color: '#1d1d1f' }}>
                    {status.active_session.start_time}
                  </div>
                </div>
                <div style={{ height: '24px', width: '1px', background: '#d2d2d7' }} />
                <div>
                  <div style={{ fontSize: '0.6875rem', color: '#86868b', fontWeight: 500 }}>경과 시간</div>
                  <div style={{ fontSize: '0.8125rem', color: '#0066cc', fontWeight: 600 }}>
                    {status.active_session.duration_str}
                  </div>
                </div>
              </div>
            )}

            {/* Right Status: Clock */}
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#86868b' }}>
              <div>DCS 갱신: <strong className="font-mono" style={{ color: '#1d1d1f' }}>{status.server_time_kst}</strong></div>
              <div style={{ marginTop: '2px' }}>로컬: {lastUpdated}</div>
            </div>
          </div>
        )}

        {/* 3. Silo 3-Card Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          {['A', 'B', 'C'].map(siloKey => {
            const isActive = status?.incoming_silo === siloKey && status?.is_feeding;
            const level = status?.levels ? (status.levels as any)[siloKey] || 0.0 : 0.0;
            const lastInfo = getLastCompletedLot(siloKey);

            return (
              <SiloCard
                key={siloKey}
                siloName={siloKey}
                level={level}
                isActive={!!isActive}
                activeSession={isActive ? status?.active_session : null}
                lastLotNo={lastInfo.lot_no}
                lastEndTime={lastInfo.end_time}
              />
            );
          })}
        </div>

        {/* 4. Session History Table */}
        <SessionHistoryTable
          sessions={history}
          onSelectSession={handleOpenLotAnalysis}
          onOpenHistorySearch={() => setIsHistorySearchModalOpen(true)}
        />
      </main>

      {/* 5. Tag Monitor Modal */}
      <TagMonitorModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        tags={status?.tag_details || {}}
        valveSumO4={status?.valve_sum_o4 || 0}
        feedStatus={status?.status_text || 'Stop'}
        incomingSilo={status?.incoming_silo || null}
      />

      {/* 6. Lot Quality Analysis Modal */}
      <LotAnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        data={selectedLotData}
        loading={analysisLoading}
      />

      {/* 7. Audit Log Modal */}
      <AuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />

      {/* 8. Past Lot History Search Modal */}
      <LotHistorySearchModal
        isOpen={isHistorySearchModalOpen}
        onClose={() => setIsHistorySearchModalOpen(false)}
        onSelectLot={(sess) => {
          setIsHistorySearchModalOpen(false);
          handleOpenLotAnalysis(sess);
        }}
      />

      {/* Apple Footer (Parchment backdrop, 12px fine-print) */}
      <footer style={{
        backgroundColor: '#f5f5f7',
        borderTop: '1px solid #e5e5ea',
        padding: '32px 24px',
        marginTop: 'auto'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: '#86868b'
        }}>
          <div>삼양 이노켐 BPA 품질관리 자동화 시스템 (Certification Automation 2.0)</div>
          <div>AVEVA PI Web API Live System</div>
        </div>
      </footer>
    </div>
  );
}

export default App;
