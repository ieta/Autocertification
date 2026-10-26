import React, { useState, useEffect } from 'react';
import { Search, X, Calendar, Download, FileText, CheckCircle2, RefreshCw } from 'lucide-react';
import type { ImportSession } from './SessionHistoryTable';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectLot: (session: ImportSession) => void;
}

export const LotHistorySearchModal: React.FC<Props> = ({ isOpen, onClose, onSelectLot }) => {
  const [history, setHistory] = useState<ImportSession[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [siloFilter, setSiloFilter] = useState<string>('ALL');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/silos/history?days=30&limit=50');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error('Failed to load past lots:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtered list
  const filtered = history.filter((item) => {
    const matchesSearch =
      searchTerm.trim() === '' ||
      item.lot_no.toLowerCase().includes(searchTerm.toLowerCase().trim());
    const matchesSilo = siloFilter === 'ALL' || item.silo === siloFilter;
    return matchesSearch && matchesSilo;
  });

  // Direct MIS Quick Copy function for a lot
  const handleQuickCopyMIS = async (lotNo: string) => {
    try {
      const res = await fetch(`/api/analysis/lot/${lotNo}`);
      if (!res.ok) {
        alert(`Lot ${lotNo} 분석 데이터 조회 실패`);
        return;
      }
      const data = await res.json();
      const avg = data.averages || {};
      const misOrder = [
        "Ash", "Color_b", "Free_Phenol", "Iron", "Moisture",
        "Purity", "Transparency", "Color_APHA", "Heat_APHA",
        "Freezing_Point", "ISB_Liquid_Viscosity"
      ];
      const values = misOrder.map(k => {
        const val = avg[k];
        return (val !== undefined && val !== null) ? val : "";
      });
      const tsvText = values.join("\t");
      await navigator.clipboard.writeText(tsvText);
      setCopyFeedback(lotNo);
      setTimeout(() => setCopyFeedback(null), 2500);
    } catch (e) {
      console.error('MIS Copy failed:', e);
      alert('MIS 복사 중 오류가 발생했습니다.');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '1000px',
        maxWidth: '96vw',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        background: '#111827',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(17, 24, 39, 0.95)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#60A5FA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calendar size={22} />
            </div>
            <div>
              <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                과거 Lot 이력 및 MIS 데이터 조회
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>
                주말/연휴 및 과거 30일간 완료된 모든 Lot 번호를 검색하고 MIS 입력용 엑셀 수치를 즉시 복사합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '8px', borderRadius: '8px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div style={{
          padding: '16px 24px',
          background: 'rgba(31, 41, 55, 0.5)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {/* Search Box */}
          <div style={{
            position: 'relative',
            flex: '1 1 300px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', color: '#9CA3AF' }} />
            <input
              type="text"
              placeholder="Lot 번호 검색 (예: 26AJ24, 26BJ25)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 38px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: '#1F2937',
                color: '#F9FAFB',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Silo Selector */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {['ALL', 'A', 'B', 'C'].map((s) => (
              <button
                key={s}
                onClick={() => setSiloFilter(s)}
                className={`btn ${siloFilter === s ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '8px 14px',
                  fontSize: '0.8125rem',
                  fontWeight: 600
                }}
              >
                {s === 'ALL' ? '전체 Silo' : `Silo ${s}`}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchHistory}
            className="btn btn-secondary"
            disabled={loading}
            style={{ padding: '8px 14px', fontSize: '0.8125rem' }}
          >
            <RefreshCw size={14} className={loading ? 'liquid-wave' : ''} />
            새로고침
          </button>
        </div>

        {/* Copy Success Feedback Banner */}
        {copyFeedback && (
          <div style={{
            padding: '10px 24px',
            background: 'rgba(16, 185, 129, 0.2)',
            borderBottom: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34D399',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} />
            <strong>[Lot {copyFeedback}]</strong> 11개 품질분석 수치가 클립보드에 복사되었습니다. (MIS 엑셀에 Ctrl+V 하세요)
          </div>
        )}

        {/* Table Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
              <div className="liquid-wave" style={{ width: '32px', height: '32px', border: '3px solid #3B82F6', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px' }} />
              과거 수입 이력을 불러오는 중입니다...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
              조건에 일치하는 과거 Lot 이력이 없습니다.
            </div>
          ) : (
            <table className="custom-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Silo</th>
                  <th>Lot No.</th>
                  <th>수입 완료일시 (END)</th>
                  <th>수입 소요시간</th>
                  <th>상태</th>
                  <th style={{ textAlign: 'center', width: '260px' }}>작업 (MIS 복사 / 성적서)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sess, idx) => (
                  <tr key={idx}>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        background: sess.silo === 'A' ? 'rgba(59, 130, 246, 0.2)' : sess.silo === 'B' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: sess.silo === 'A' ? '#60A5FA' : sess.silo === 'B' ? '#34D399' : '#FBBF24'
                      }}>
                        {sess.silo}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.9375rem', color: '#F3F4F6' }}>
                        {sess.lot_no}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: '#D1D5DB' }}>
                      {sess.end_time || '-'}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>
                      {sess.duration_str || '-'}
                    </td>
                    <td>
                      {sess.is_active ? (
                        <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>진행중</span>
                      ) : (
                        <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>완료</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleQuickCopyMIS(sess.lot_no)}
                          className="btn btn-secondary"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.75rem',
                            gap: '4px',
                            color: '#34D399',
                            borderColor: 'rgba(52, 211, 153, 0.3)'
                          }}
                          title="11개 품질분석 수치를 엑셀 행 복사"
                        >
                          <Download size={13} />
                          MIS 복사
                        </button>
                        <button
                          onClick={() => {
                            onSelectLot(sess);
                          }}
                          className="btn btn-primary"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.75rem',
                            gap: '4px'
                          }}
                          title="상세 분석표 및 공식 성적서 보기"
                        >
                          <FileText size={13} />
                          성적서 조회
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(17, 24, 39, 0.95)',
          fontSize: '0.8125rem',
          color: '#9CA3AF'
        }}>
          <div>
            총 <strong>{filtered.length}</strong>건의 Lot 이력 표시 중
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
