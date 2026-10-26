import React from 'react';
import { X, Activity } from 'lucide-react';

interface TagDetail {
  value: any;
  timestamp_kst: string;
  good: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tags: Record<string, TagDetail>;
  valveSumO4: number;
  feedStatus: string;
  incomingSilo: string | null;
}

export const TagMonitorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  tags,
  valveSumO4,
  feedStatus,
  incomingSilo
}) => {
  if (!isOpen) return null;

  const hvValves = Object.keys(tags).filter(k => k.startsWith('HV1501')).sort();
  const routingValves = ['HV1602.MV', 'UV1602ADO.PV', 'UV1602BDO.PV'];
  const levelTags = ['LI1602AB.PV', 'LI1602BB.PV', 'LI1602CB.PV'];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '850px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        background: '#111827',
        border: '1px solid #374151',
        padding: '24px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #374151', paddingBottom: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={24} style={{ color: '#3B82F6' }} />
            <div>
              <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                PI Server DCS 감시 태그 실시간 모니터
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>
                Silo 방향 판정에 활용되는 14개 감시 태그의 실시간 수집 값 및 판정 계산식
              </p>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '6px 10px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Logic summary card */}
        <div style={{ background: '#1F2937', borderRadius: '10px', padding: '16px', marginBottom: '20px', border: '1px solid #374151' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#60A5FA', marginBottom: '6px' }}>
            실시간 판정 공식 대조
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '0.8125rem' }}>
            <div>
              <span style={{ color: '#9CA3AF' }}>공급 판정식 (O4): </span>
              <span className="font-mono" style={{ color: '#F3F4F6', fontWeight: 600 }}>
                SUM(HV1501A~I)/2 = {valveSumO4.toFixed(1)} ({feedStatus})
              </span>
            </div>
            <div>
              <span style={{ color: '#9CA3AF' }}>수입 방향 (Q4): </span>
              <span className="font-mono" style={{ color: '#34D399', fontWeight: 700 }}>
                {incomingSilo ? `Silo ${incomingSilo}` : '수입 중단'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: Feed Valves */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#E5E7EB', marginBottom: '10px' }}>
            1. 공정 공급 이송 라인 밸브 (HV1501A ~ I)
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {hvValves.map(tag => {
              const dt = tags[tag];
              const val = dt ? dt.value : '-';
              const isOpen = Number(val) > 0;
              return (
                <div key={tag} style={{
                  background: '#1F2937',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: `1px solid ${isOpen ? 'rgba(16, 185, 129, 0.4)' : '#374151'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="font-mono" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{tag}</span>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: isOpen ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.3)',
                      color: isOpen ? '#34D399' : '#9CA3AF'
                    }}>
                      {val} ({isOpen ? 'OPEN' : 'CLOSE'})
                    </span>
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#6B7280', marginTop: '4px' }}>
                    {dt?.timestamp_kst || '-'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Direction Routing Valves */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#E5E7EB', marginBottom: '10px' }}>
            2. 수입 방향 라우팅 밸브
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {routingValves.map(tag => {
              const dt = tags[tag];
              const val = dt ? dt.value : '-';
              return (
                <div key={tag} style={{ background: '#1F2937', padding: '12px 14px', borderRadius: '8px', border: '1px solid #374151' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="font-mono" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{tag}</span>
                    <span className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: '#60A5FA' }}>
                      {String(val)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#6B7280', marginTop: '6px' }}>
                    {dt?.timestamp_kst || '-'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Silo Levels */}
        <div>
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#E5E7EB', marginBottom: '10px' }}>
            3. Silo 실시간 레벨 계측기 (Level Transmitter)
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {levelTags.map(tag => {
              const dt = tags[tag];
              const val = dt && typeof dt.value === 'number' ? dt.value.toFixed(2) : '-';
              return (
                <div key={tag} style={{ background: '#1F2937', padding: '12px 14px', borderRadius: '8px', border: '1px solid #374151' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="font-mono" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{tag}</span>
                    <span className="font-mono" style={{ fontSize: '1.125rem', fontWeight: 700, color: '#10B981' }}>
                      {val} %
                    </span>
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#6B7280', marginTop: '6px' }}>
                    {dt?.timestamp_kst || '-'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
