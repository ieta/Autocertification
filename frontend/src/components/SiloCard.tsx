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
  // Clamp level between 0 and 100 for SVG display
  const clampedLevel = Math.max(0, Math.min(100, level));
  const fillHeight = 160 * (clampedLevel / 100);
  const fillY = 200 - fillHeight;

  // 통일된 Silo 액체 색상 (단일 브랜드 블루/시안)
  const liquidColor = isActive ? '#10B981' : '#3B82F6';

  return (
    <div className={`glass-panel p-6 relative overflow-hidden ${isActive ? 'active-silo-card' : ''}`}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(55, 65, 81, 0.4)',
            color: isActive ? '#34D399' : '#9CA3AF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Database size={20} />
          </div>
          <div>
            <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Silo {siloName}
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>BPA 저장조</p>
          </div>
        </div>

        {/* Status Badge */}
        {isActive ? (
          <span className="badge badge-success">
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34D399', display: 'inline-block', animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
            수입 중
          </span>
        ) : (
          <span className="badge badge-neutral">대기</span>
        )}
      </div>

      {/* Main Content: SVG Silo & Metrics */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', margin: '16px 0' }}>
        {/* 3D Silo SVG Graphic */}
        <div style={{ width: '90px', height: '160px', position: 'relative', flexShrink: 0 }}>
          <svg viewBox="0 0 100 200" width="100%" height="100%" style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}>
            <defs>
              <linearGradient id={`grad-${siloName}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={liquidColor} stopOpacity="0.8" />
                <stop offset="50%" stopColor={liquidColor} stopOpacity="1" />
                <stop offset="100%" stopColor={liquidColor} stopOpacity="0.6" />
              </linearGradient>
              <clipPath id={`clip-${siloName}`}>
                <path d="M 15 35 Q 50 20 85 35 L 85 180 Q 50 195 15 180 Z" />
              </clipPath>
            </defs>

            {/* Silo Outer Container */}
            <path
              d="M 15 35 Q 50 20 85 35 L 85 180 Q 50 195 15 180 Z"
              fill="#1F2937"
              stroke="#4B5563"
              strokeWidth="2.5"
            />
            {/* Silo Top Cap */}
            <ellipse cx="50" cy="35" rx="35" ry="12" fill="#374151" stroke="#6B7280" strokeWidth="1.5" />
            <ellipse cx="50" cy="35" rx="14" ry="5" fill="#4B5563" />

            {/* Liquid Fill */}
            <g clipPath={`url(#clip-${siloName})`}>
              <rect
                x="10"
                y={fillY}
                width="80"
                height={fillHeight + 20}
                fill={`url(#grad-${siloName})`}
                style={{ transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
              {fillHeight > 5 && (
                <ellipse
                  cx="50"
                  cy={fillY}
                  rx="35"
                  ry="7"
                  fill={liquidColor}
                  opacity="0.9"
                  style={{ transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
              )}
            </g>

            {/* Scale Markings */}
            <line x1="20" y1="70" x2="30" y2="70" stroke="#9CA3AF" strokeWidth="1.5" opacity="0.6" />
            <line x1="20" y1="110" x2="35" y2="110" stroke="#9CA3AF" strokeWidth="2" opacity="0.8" />
            <line x1="20" y1="150" x2="30" y2="150" stroke="#9CA3AF" strokeWidth="1.5" opacity="0.6" />
          </svg>
        </div>

        {/* Level Number and Info */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
            적재율 (Level)
          </div>
          {/* A, B, C 일관된 통일 색상 (#F9FAFB) */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="font-display font-mono" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#F9FAFB' }}>
              {level.toFixed(2)}
            </span>
            <span style={{ fontSize: '1.25rem', color: '#9CA3AF', fontWeight: 600 }}>%</span>
          </div>

          {/* Time & Duration Info */}
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {isActive && activeSession ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#9CA3AF' }}>
                  <Clock size={13} style={{ color: '#34D399' }} />
                  <span>개시:</span>
                  <span className="font-mono" style={{ color: '#E5E7EB' }}>{activeSession.start_time}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#34D399', fontWeight: 600 }}>
                  <Activity size={13} />
                  <span>{activeSession.duration_str}</span>
                </div>
              </>
            ) : lastEndTime ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#9CA3AF' }}>
                <Clock size={13} />
                <span>완료: {lastEndTime}</span>
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>이력 없음</div>
            )}
          </div>
        </div>
      </div>

      {/* Prominent Lot No. Box (과한 뱃지 제거 및 간결화) */}
      <div style={{
        marginTop: '14px',
        padding: '12px 16px',
        borderRadius: '10px',
        background: isActive
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 78, 59, 0.25) 100%)'
          : 'rgba(31, 41, 55, 0.65)',
        border: isActive ? '1.5px solid #10B981' : '1px solid #374151',
        boxShadow: isActive ? '0 0 16px rgba(16, 185, 129, 0.2)' : 'none'
      }}>
        <div style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: isActive ? '#A7F3D0' : '#9CA3AF',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '2px'
        }}>
          <Tag size={13} style={{ color: isActive ? '#34D399' : '#60A5FA' }} />
          <span>{isActive ? '수입 중 LOT' : '최근 완료 LOT'}</span>
        </div>
        <div
          className="font-mono"
          style={{
            fontSize: '1.625rem',
            fontWeight: 800,
            color: isActive ? '#34D399' : '#F9FAFB',
            letterSpacing: '0.06em',
            lineHeight: 1.2
          }}
        >
          {isActive ? (activeSession?.lot_no || '-') : (lastLotNo || '-')}
        </div>
      </div>
    </div>
  );
};
