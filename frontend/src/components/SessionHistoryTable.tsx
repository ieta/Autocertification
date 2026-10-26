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
}

export const SessionHistoryTable: React.FC<Props> = ({ sessions, onSelectSession }) => {
  return (
    <div className="glass-panel" style={{ padding: '24px', marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#60A5FA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <History size={20} />
          </div>
          <div>
            <h3 className="font-display" style={{ fontSize: '1.125rem', fontWeight: 700 }}>
              Silo 수입 세션 이력 (ST ~ END 구간 및 Lot)
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>
              수입 개시일 기준 자동 채번된 최근 5개 세션 내역입니다. 기 수입 완료된 Lot의 분석 데이터 조회가 가능합니다.
            </p>
          </div>
        </div>

        <span className="badge badge-primary">
          최근 {sessions.length}개 세션
        </span>
      </div>

      {/* 안내 팁 박스 */}
      <div style={{
        padding: '10px 14px',
        borderRadius: '8px',
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.8125rem',
        color: '#93C5FD'
      }}>
        <span>💡</span>
        <span>
          <strong>수입 완료된 Lot</strong>(예: <strong>26BJ25</strong>)의 <strong>[성적서 / 분석 조회]</strong> 버튼을 누르면 해당 구간(ST~END)의 11개 공정분석 집계치 및 규격 판정표를 확인할 수 있습니다.
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
                <tr key={idx} style={{ background: isCurrent ? 'rgba(16, 185, 129, 0.05)' : 'transparent' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        background: sess.silo === 'A' ? 'rgba(59, 130, 246, 0.2)' : sess.silo === 'B' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: sess.silo === 'A' ? '#60A5FA' : sess.silo === 'B' ? '#34D399' : '#FBBF24'
                      }}>
                        {sess.silo}
                      </span>
                      <span style={{ fontWeight: 600 }}>Silo {sess.silo}</span>
                    </div>
                  </td>
                  <td>
                    <span className="font-mono" style={{
                      fontWeight: 700,
                      fontSize: '0.9375rem',
                      color: isCurrent ? '#34D399' : '#F3F4F6',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: isCurrent ? 'rgba(16, 185, 129, 0.15)' : 'rgba(55, 65, 81, 0.5)'
                    }}>
                      {sess.lot_no}
                    </span>
                  </td>
                  <td className="font-mono" style={{ color: '#E5E7EB' }}>
                    {sess.start_time}
                  </td>
                  <td className="font-mono" style={{ color: isCurrent ? '#34D399' : '#E5E7EB', fontWeight: isCurrent ? 600 : 400 }}>
                    {sess.end_time}
                  </td>
                  <td style={{ color: '#9CA3AF' }}>
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
                        <CheckCircle2 size={12} style={{ color: '#9CA3AF' }} />
                        수입 완료
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {isCurrent ? (
                      <span style={{
                        display: 'inline-block',
                        fontSize: '0.75rem',
                        color: '#9CA3AF',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        background: 'rgba(55, 65, 81, 0.4)',
                        border: '1px solid rgba(75, 85, 99, 0.3)'
                      }}>
                        수입 진행 중 (집계 대기)
                      </span>
                    ) : (
                      <button
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.8125rem', gap: '5px', boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)' }}
                        onClick={() => onSelectSession && onSelectSession(sess)}
                      >
                        <FileText size={14} />
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
