import { useState, useEffect } from 'react';
import { SiloCard } from './components/SiloCard';
import { SessionHistoryTable, type ImportSession } from './components/SessionHistoryTable';
import { TagMonitorModal } from './components/TagMonitorModal';
import { LotAnalysisModal, type LotAnalysisData } from './components/LotAnalysisModal';
import { AuditLogModal } from './components/AuditLogModal';
import {
  Activity,
  RefreshCw,
  Layers,
  ShieldCheck,
  FileCheck
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
      // 1. Fetch status
      const resStatus = await fetch('/api/silos/status');
      if (resStatus.ok) {
        const dataStatus = await resStatus.json();
        setStatus(dataStatus);
      }

      // 2. Fetch history (최근 5개 세션)
      const resHistory = await fetch('/api/silos/history?days=14&limit=5');
      if (resHistory.ok) {
        const dataHistory = await resHistory.json();
        setHistory(dataHistory.slice(0, 5));
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
    const interval = setInterval(fetchData, 10 * 60 * 1000); // 10분 주기 갱신 (서버 부하 방지)
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Find latest completed sessions for each silo to show in non-active cards
  const getLastCompletedLot = (silo: string) => {
    const found = history.find(h => h.silo === silo && !h.is_active);
    return {
      lot_no: found ? found.lot_no : '-',
      end_time: found ? found.end_time : '-'
    };
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 20px' }}>
      {/* 1. Header Navigation */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '20px',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
          }}>
            <Layers size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 className="font-display" style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Samyang Innochem QC
              </h1>
              <span className="badge badge-primary" style={{ fontSize: '0.6875rem' }}>v2.0 WebApp</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>
              AVEVA PI Web API 실시간 Silo 수입 모니터링 및 성적서 자동 채번 시스템
            </p>
          </div>
        </div>

        {/* Header Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Tag Monitor Modal Toggle */}
          <button
            className="btn btn-secondary"
            onClick={() => setIsTagModalOpen(true)}
            style={{ fontSize: '0.8125rem' }}
          >
            <Activity size={15} style={{ color: '#60A5FA' }} />
            DCS 태그 모니터
          </button>

          {/* Audit Log Modal Toggle */}
          <button
            className="btn btn-secondary"
            onClick={() => setIsAuditModalOpen(true)}
            style={{ fontSize: '0.8125rem', gap: '6px' }}
            title="협력업체 성적서 발행 이력 및 전일 리포트 메일링 상태 확인"
          >
            <FileCheck size={15} style={{ color: '#34D399' }} />
            발행 감사 이력
          </button>

          {/* Auto Refresh Toggle */}
          <button
            className={`btn ${autoRefresh ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{ fontSize: '0.8125rem' }}
          >
            <RefreshCw size={14} className={autoRefresh ? 'liquid-wave' : ''} />
            {autoRefresh ? '자동 갱신 (10m)' : '수동 갱신'}
          </button>

          {/* Manual Refresh */}
          <button
            className="btn btn-secondary"
            onClick={fetchData}
            title="새로고침"
            style={{ padding: '8px 12px' }}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'liquid-wave' : ''} />
          </button>
        </div>
      </header>

      {/* 2. Top Banner: Current Operation Status */}
      {status && (
        <div className="glass-panel" style={{
          padding: '18px 24px',
          marginBottom: '24px',
          background: status.is_feeding
            ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.12) 0%, rgba(17, 24, 39, 0.8) 100%)'
            : 'linear-gradient(90deg, rgba(239, 68, 68, 0.12) 0%, rgba(17, 24, 39, 0.8) 100%)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px'
        }}>
          {/* Status Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: status.is_feeding ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: status.is_feeding ? '#34D399' : '#F87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {status.is_feeding ? <ShieldCheck size={26} /> : <Activity size={26} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>공정 상태:</span>
                <span className="font-display font-mono" style={{
                  fontWeight: 800,
                  fontSize: '1.1875rem',
                  color: status.is_feeding ? '#34D399' : '#F87171'
                }}>
                  {status.is_feeding ? 'FEED (공급 중)' : 'STOP (공급 중단)'}
                </span>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#E5E7EB', marginTop: '2px' }}>
                수입 Silo: <strong style={{ color: '#60A5FA' }}>{status.direction_desc}</strong>
              </p>
            </div>
          </div>

          {/* Status Center: Active Lot Highlight */}
          {status.active_session && (
            <div style={{
              background: 'rgba(31, 41, 55, 0.6)',
              border: '1px solid #374151',
              borderRadius: '10px',
              padding: '8px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div>
                <div style={{ fontSize: '0.6875rem', color: '#9CA3AF', textTransform: 'uppercase' }}>
                  수입 진행 LOT
                </div>
                <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34D399' }}>
                  {status.active_session.lot_no}
                </div>
              </div>
              <div style={{ height: '28px', width: '1px', background: '#4B5563' }} />
              <div>
                <div style={{ fontSize: '0.6875rem', color: '#9CA3AF' }}>개시 일시</div>
                <div className="font-mono" style={{ fontSize: '0.8125rem', color: '#F3F4F6', fontWeight: 600 }}>
                  {status.active_session.start_time}
                </div>
              </div>
              <div style={{ height: '28px', width: '1px', background: '#4B5563' }} />
              <div>
                <div style={{ fontSize: '0.6875rem', color: '#9CA3AF' }}>경과 시간</div>
                <div style={{ fontSize: '0.8125rem', color: '#34D399', fontWeight: 600 }}>
                  {status.active_session.duration_str}
                </div>
              </div>
            </div>
          )}

          {/* Status Right: Clock */}
          <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#9CA3AF' }}>
            <div>DCS 갱신: <strong className="font-mono" style={{ color: '#F3F4F6' }}>{status.server_time_kst}</strong></div>
            <div style={{ color: '#6B7280', marginTop: '2px' }}>로컬: {lastUpdated}</div>
          </div>
        </div>
      )}

      {/* 3. Silo 3-Card Visual Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        marginBottom: '24px'
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
      />

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

      {/* Footer */}
      <footer style={{
        marginTop: '40px',
        paddingTop: '20px',
        borderTop: '1px solid #1F2937',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.8125rem',
        color: '#6B7280'
      }}>
        <div>삼양 이노켐 BPA 품질관리 자동화 시스템 (Certification Automation 2.0)</div>
        <div>AVEVA PI Web API Direct Live Streaming</div>
      </footer>
    </div>
  );
}

export default App;
