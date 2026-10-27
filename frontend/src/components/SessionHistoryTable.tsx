import React from 'react';
import { History, FileText, CheckCircle2, PlayCircle } from 'lucide-react';

export interface ImportSession {
  silo: string;
  lot_no: string;
  start_time: string;
  end_time: string;
  duration_str: string;
  is_active: boolean;
}

interface Props {
  sessions: ImportSession[];
  onSelectSession?: (session: ImportSession) => void;
  onOpenHistorySearch?: () => void;
}

export const SessionHistoryTable: React.FC<Props> = ({ sessions, onSelectSession, onOpenHistorySearch }) => {
  return (
    <div className="apple-card" style={{ padding: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(0, 102, 204, 0.08)',
            color: '#0066cc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <History size={18} />
          </div>
          <div>
            <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.02em' }}>
              Silo별 성적서 대상 Lot 현황
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#86868b', letterSpacing: '-0.01em' }}>
              각 Silo 저장조별 최신 대상 Lot 및 성적서 발행 현황입니다 (설비별 1개 Lot 고정).
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onOpenHistorySearch && (
            <button
              onClick={onOpenHistorySearch}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '6px 14px', gap: '6px' }}
            >
              <History size={13} style={{ color: '#0066cc' }} />
              과거 Lot 전체 조회
            </button>
          )}
          <span className="badge badge-primary">
            Silo A · B · C (3기)
          </span>
        </div>
      </div>

      {/* Apple Subtle Tip Box */}
      <div style={{
        padding: '12px 18px',
        borderRadius: '12px',
        background: '#f5f5f7',
        border: '1px solid #e5e5ea',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '0.8125rem',
        color: '#1d1d1f'
      }}>
        <span style={{ fontSize: '1rem' }}>💡</span>
        <span>
          Silo A, B, C 각 저장조의 최신 대상 Lot입니다. <strong>수입이 완료된 Silo</strong>의 <strong>[성적서 / 분석 조회]</strong> 버튼을 누르면 해당 Lot의 품질분석 결과 확인 및 성적서 PDF 조회가 가능합니다.
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>대상 Silo</th>
              <th>자동 부여 Lot No.</th>
              <th>수입 개시일시 (ST)</th>
              <th>수입 종료일시 (END)</th>
              <th>총 수입 소요시간</th>
              <th>운전 상태</th>
              <th style={{ textAlign: 'center' }}>분석 데이터 / 성적서</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((sess, idx) => {
              const isCurrent = sess.is_active;
              return (
                <tr key={idx} style={{ background: isCurrent ? 'rgba(52, 199, 89, 0.04)' : 'transparent' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        background: sess.silo === 'A' ? 'rgba(0, 102, 204, 0.1)' : sess.silo === 'B' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 149, 0, 0.1)',
                        color: sess.silo === 'A' ? '#0066cc' : sess.silo === 'B' ? '#28a745' : '#d97706'
                      }}>
                        {sess.silo}
                      </span>
                      <span style={{ fontWeight: 600, color: '#1d1d1f' }}>Silo {sess.silo}</span>
                    </div>
                  </td>
                  <td>
                    <span className="font-mono" style={{
                      fontWeight: 600,
                      fontSize: '0.9375rem',
                      color: isCurrent ? '#28a745' : '#1d1d1f',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: isCurrent ? 'rgba(52, 199, 89, 0.12)' : '#f5f5f7'
                    }}>
                      {sess.lot_no}
                    </span>
                  </td>
                  <td className="font-mono" style={{ color: '#1d1d1f', fontSize: '0.8125rem' }}>
                    {sess.start_time}
                  </td>
                  <td className="font-mono" style={{ color: isCurrent ? '#28a745' : '#1d1d1f', fontWeight: isCurrent ? 600 : 400, fontSize: '0.8125rem' }}>
                    {sess.end_time}
                  </td>
                  <td style={{ color: '#86868b', fontSize: '0.8125rem' }}>
                    {sess.duration_str}
                  </td>
                  <td>
                    {isCurrent ? (
                      <span className="badge badge-success" style={{ gap: '4px' }}>
                        <PlayCircle size={12} />
                        수입 중
                      </span>
                    ) : (
                      <span className="badge badge-neutral" style={{ gap: '4px' }}>
                        <CheckCircle2 size={12} style={{ color: '#86868b' }} />
                        수입 완료
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {isCurrent ? (
                      <span style={{
                        display: 'inline-block',
                        fontSize: '0.75rem',
                        color: '#86868b',
                        padding: '5px 12px',
                        borderRadius: '9999px',
                        background: '#f5f5f7',
                        border: '1px solid #e5e5ea'
                      }}>
                        수입 진행 중 (집계 대기)
                      </span>
                    ) : (
                      <button
                        className="btn btn-primary"
                        style={{ padding: '6px 16px', fontSize: '0.75rem', gap: '5px' }}
                        onClick={() => onSelectSession && onSelectSession(sess)}
                      >
                        <FileText size={13} />
                        성적서 / 분석 조회
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
