import React from 'react';
import { Database, Clock, Tag, Activity } from 'lucide-react';

interface ActiveSession {
  silo: string;
  lot_no: string;
  start_time: string;
  end_time: string;
  duration_str: string;
}

interface SiloCardProps {
  siloName: string;
  level: number;
  isActive: boolean;
  activeSession?: ActiveSession | null;
  lastLotNo?: string;
  lastEndTime?: string;
}

export const SiloCard: React.FC<SiloCardProps> = ({
  siloName,
  level,
  isActive,
  activeSession,
  lastLotNo,
  lastEndTime
}) => {
  const clampedLevel = Math.max(0, Math.min(100, level));
  const fillHeight = 160 * (clampedLevel / 100);
  const fillY = 200 - fillHeight;

  // Apple Design: Action Blue (#0066cc) vs Apple Green (#34c759)
  const liquidColor = isActive ? '#34c759' : '#0066cc';

  return (
    <div
      className={`apple-card p-6 relative overflow-hidden ${isActive ? 'active-silo-card' : ''}`}
      style={{
        padding: '24px',
        position: 'relative'
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: isActive ? 'rgba(52, 199, 89, 0.12)' : 'rgba(0, 102, 204, 0.08)',
            color: isActive ? '#28a745' : '#0066cc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Database size={18} />
          </div>
          <div>
            <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.02em' }}>
              Silo {siloName}
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#86868b' }}>BPA 저장조</p>
          </div>
        </div>

        {/* Status Badge */}
        {isActive ? (
          <span className="badge badge-success">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#28a745', display: 'inline-block' }} />
            수입 중
          </span>
        ) : (
          <span className="badge badge-neutral">대기</span>
        )}
      </div>

      {/* Main Content: SVG Silo & Metrics */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', margin: '16px 0' }}>
        {/* Apple Clean Silo SVG Graphic */}
        <div style={{ width: '90px', height: '160px', position: 'relative', flexShrink: 0 }}>
          <svg viewBox="0 0 100 200" width="100%" height="100%" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.06))' }}>
            <defs>
              <linearGradient id={`grad-${siloName}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={liquidColor} stopOpacity="0.85" />
                <stop offset="50%" stopColor={liquidColor} stopOpacity="1" />
                <stop offset="100%" stopColor={liquidColor} stopOpacity="0.75" />
              </linearGradient>
              <clipPath id={`clip-${siloName}`}>
                <path d="M 15 35 Q 50 20 85 35 L 85 180 Q 50 195 15 180 Z" />
              </clipPath>
            </defs>

            {/* Silo Outer Container */}
            <path
              d="M 15 35 Q 50 20 85 35 L 85 180 Q 50 195 15 180 Z"
              fill="#f5f5f7"
              stroke="#d2d2d7"
              strokeWidth="2"
            />
            {/* Silo Top Cap */}
            <ellipse cx="50" cy="35" rx="35" ry="12" fill="#e5e5ea" stroke="#d2d2d7" strokeWidth="1.5" />
            <ellipse cx="50" cy="35" rx="14" ry="5" fill="#c7c7cc" />

            {/* Liquid Fill */}
            <g clipPath={`url(#clip-${siloName})`}>
              <rect
                x="10"
                y={fillY}
                width="80"
                height={fillHeight + 20}
                fill={`url(#grad-${siloName})`}
                style={{ transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
              />
              {fillHeight > 5 && (
                <ellipse
                  cx="50"
                  cy={fillY}
                  rx="35"
                  ry="7"
                  fill={liquidColor}
                  opacity="0.9"
                  style={{ transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
              )}
            </g>

            {/* Scale Markings */}
            <line x1="20" y1="70" x2="30" y2="70" stroke="#86868b" strokeWidth="1.5" opacity="0.4" />
            <line x1="20" y1="110" x2="35" y2="110" stroke="#86868b" strokeWidth="2" opacity="0.6" />
            <line x1="20" y1="150" x2="30" y2="150" stroke="#86868b" strokeWidth="1.5" opacity="0.4" />
          </svg>
        </div>

        {/* Level Number and Info */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.75rem', color: '#86868b', textTransform: 'uppercase', letterSpacing: '-0.12px', marginBottom: '2px' }}>
            적재율 (Level)
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span className="font-display font-mono" style={{ fontSize: '2.5rem', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.03em' }}>
              {level.toFixed(2)}
            </span>
            <span style={{ fontSize: '1.25rem', color: '#86868b', fontWeight: 500 }}>%</span>
          </div>

          {/* Time & Duration Info */}
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {isActive && activeSession ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#86868b' }}>
                  <Clock size={13} style={{ color: '#28a745' }} />
                  <span>개시:</span>
                  <span className="font-mono" style={{ color: '#1d1d1f', fontWeight: 500 }}>{activeSession.start_time}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#28a745', fontWeight: 600 }}>
                  <Activity size={13} />
                  <span>{activeSession.duration_str}</span>
                </div>
              </>
            ) : lastEndTime ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#86868b' }}>
                <Clock size={13} />
                <span>완료: {lastEndTime}</span>
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: '#86868b' }}>이력 없음</div>
            )}
          </div>
        </div>
      </div>

      {/* Prominent Lot No. Capsule */}
      <div style={{
        marginTop: '14px',
        padding: '12px 18px',
        borderRadius: '12px',
        background: isActive ? 'rgba(52, 199, 89, 0.08)' : '#f5f5f7',
        border: isActive ? '1px solid rgba(52, 199, 89, 0.3)' : '1px solid #e5e5ea',
        transition: 'all 0.2s ease'
      }}>
        <div style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: isActive ? '#28a745' : '#86868b',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '2px'
        }}>
          <Tag size={13} style={{ color: isActive ? '#28a745' : '#0066cc' }} />
          <span>{isActive ? '수입 중 LOT' : '최근 완료 LOT'}</span>
        </div>
        <div
          className="font-mono"
          style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: isActive ? '#28a745' : '#1d1d1f',
            letterSpacing: '-0.02em',
            lineHeight: 1.2
          }}
        >
          {isActive ? (activeSession?.lot_no || '-') : (lastLotNo || '-')}
        </div>
      </div>
    </div>
  );
};
