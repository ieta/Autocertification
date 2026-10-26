import React, { useState, useEffect } from 'react';
import { X, History, Mail, RefreshCw, CheckCircle2 } from 'lucide-react';

interface AuditLogItem {
  id: number;
  created_at_kst: string;
  lot_no: string;
  customer_name: string;
  product_name: string;
  action: string;
  operator: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [mailSending, setMailSending] = useState<boolean>(false);
  const [mailResult, setMailResult] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/audit-logs?limit=50');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error('Failed to fetch audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
      setMailResult(null);
    }
  }, [isOpen]);

  const handleTriggerMail = async () => {
    if (!confirm('전일 성적서 발행 이력 및 MIS 종합 리포트 메일을 담당자에게 즉시 발송하시겠습니까?')) {
      return;
    }
    setMailSending(true);
    setMailResult(null);
    try {
      const res = await fetch('/api/reports/trigger-daily-mail', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMailResult(`메일 발송 완료: ${data.message} (${data.log_count}건 집계)`);
      } else {
        setMailResult(`메일 발송 실패: ${data.detail || '알 수 없는 오류'}`);
      }
    } catch (e) {
      setMailResult('메일 발송 중 네트워크 오류가 발생했습니다.');
    } finally {
      setMailSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '16px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '860px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#111827',
        border: '1px solid #374151',
        padding: '24px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #374151', paddingBottom: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34D399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <History size={22} />
            </div>
            <div>
              <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                성적서 발행 감사 이력 (Audit Trail)
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>
                협력업체 성적서 발행 기록 확인 및 당일 첫 발행 시 전일 이력 자동 메일링
              </p>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '6px 10px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Action Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(31, 41, 55, 0.5)',
          padding: '10px 14px',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid rgba(55, 65, 81, 0.5)'
        }}>
          <div style={{ fontSize: '0.8125rem', color: '#E5E7EB' }}>
            총 <strong>{logs.length}</strong>건의 발행/조회 이력 기록
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={fetchLogs}
              disabled={loading}
              style={{ padding: '6px 10px', fontSize: '0.78125rem', gap: '5px' }}
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
              새로고침
            </button>
            <button
              className="btn btn-primary"
              onClick={handleTriggerMail}
              disabled={mailSending}
              style={{ padding: '6px 12px', fontSize: '0.78125rem', gap: '5px' }}
            >
              <Mail size={13} />
              {mailSending ? '발송 중...' : '전일 마감 리포트 메일 즉시 발송'}
            </button>
          </div>
        </div>

        {mailResult && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '6px',
            marginBottom: '14px',
            fontSize: '0.8125rem',
            background: mailResult.includes('완료') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${mailResult.includes('완료') ? '#10B981' : '#EF4444'}`,
            color: mailResult.includes('완료') ? '#34D399' : '#F87171',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={15} />
            <span>{mailResult}</span>
          </div>
        )}

        {/* Logs Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF' }}>
              감사 로그를 조회하는 중입니다...
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF' }}>
              기록된 성적서 발행 이력이 없습니다.
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>No</th>
                  <th>발행 일시 (KST)</th>
                  <th>Lot No.</th>
                  <th>출하 고객사</th>
                  <th>구분</th>
                  <th>작업자</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, idx) => (
                  <tr key={l.id}>
                    <td style={{ textAlign: 'center', color: '#9CA3AF' }}>{idx + 1}</td>
                    <td className="font-mono" style={{ fontSize: '0.8125rem', color: '#E5E7EB' }}>
                      {l.created_at_kst}
                    </td>
                    <td>
                      <span className="font-mono" style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#60A5FA',
                        fontWeight: 700
                      }}>
                        {l.lot_no}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{l.customer_name}</td>
                    <td>
                      <span className={`badge ${l.action === 'DOWNLOAD' ? 'badge-success' : 'badge-neutral'}`}>
                        {l.action === 'DOWNLOAD' ? '다운로드' : '화면 조회'}
                      </span>
                    </td>
                    <td style={{ color: '#9CA3AF', fontSize: '0.8125rem' }}>{l.operator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #374151', paddingTop: '14px', marginTop: '12px' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
