import React from 'react';
import { X, CheckCircle2, XCircle, FileText, Download } from 'lucide-react';

interface ItemEval {
  value: string;
  unit: string;
  spec: string;
  passed: boolean;
}

export interface LotAnalysisData {
  lot_no: string;
  st_range: string;
  matched_count: number;
  is_all_passed: boolean;
  items: Record<string, ItemEval>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: LotAnalysisData | null;
  loading: boolean;
}

export const LotAnalysisModal: React.FC<Props> = ({
  isOpen,
  onClose,
  data,
  loading
}) => {
  if (!isOpen) return null;

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
      zIndex: 1100,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        background: '#111827',
        border: '1px solid #374151',
        padding: '24px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #374151', paddingBottom: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(37, 99, 235, 0.2)',
              color: '#60A5FA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  성적서 Lot 품질분석 집계 내역
                </h2>
                {data && (
                  <span className={`badge ${data.is_all_passed ? 'badge-success' : 'badge-warning'}`}>
                    {data.is_all_passed ? '규격 적합 (PASS)' : '규격 미달 (FAIL)'}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>
                수입 구간 내 공정분석 시계열 평균치 및 품질 스펙 대조 결과
              </p>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '6px 10px' }}>
            <X size={18} />
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
            분석 데이터를 집계하는 중입니다...
          </div>
        )}

        {!loading && data && (
          <>
            {/* Meta Summary Bar */}
            <div style={{
              background: '#1F2937',
              borderRadius: '10px',
              padding: '14px 18px',
              marginBottom: '18px',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>대상 LOT: </span>
                <strong className="font-mono" style={{ fontSize: '1.125rem', color: '#34D399', marginLeft: '4px' }}>
                  {data.lot_no}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>수입 구간: </span>
                <span className="font-mono" style={{ fontSize: '0.8125rem', color: '#E5E7EB', marginLeft: '4px' }}>
                  {data.st_range}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>매칭 분석치: </span>
                <span style={{ fontSize: '0.8125rem', color: '#60A5FA', fontWeight: 600 }}>
                  {data.matched_count}건 평균 집계
                </span>
              </div>
            </div>

            {/* Test Items Table */}
            <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>시험 항목 (Test Item)</th>
                    <th style={{ textAlign: 'right' }}>분석 결과값</th>
                    <th>단위</th>
                    <th>품질 규격 기준 (Spec)</th>
                    <th style={{ textAlign: 'center' }}>합부 판정</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.items).map(([itemName, evalItem]) => (
                    <tr key={itemName}>
                      <td style={{ fontWeight: 600, color: '#E5E7EB' }}>
                        {itemName}
                      </td>
                      <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.9375rem', color: '#F9FAFB' }}>
                        {evalItem.value}
                      </td>
                      <td style={{ color: '#9CA3AF', fontSize: '0.8125rem' }}>
                        {evalItem.unit || '-'}
                      </td>
                      <td style={{ color: '#9CA3AF', fontSize: '0.8125rem' }}>
                        {evalItem.spec || '규격 없음'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {evalItem.passed ? (
                          <span style={{ color: '#34D399', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem', fontWeight: 700 }}>
                            <CheckCircle2 size={15} /> PASS
                          </span>
                        ) : (
                          <span style={{ color: '#F87171', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem', fontWeight: 700 }}>
                            <XCircle size={15} /> FAIL
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #374151', paddingTop: '16px' }}>
              <button className="btn btn-secondary" onClick={onClose}>
                닫기
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  alert(`[성적서 발행 연동]\n\nLot No: ${data.lot_no}\n종합 판정: 적합 (PASS)\n\nWord 템플릿 치환 및 PDF 출력이 곧 연동됩니다.`);
                }}
              >
                <Download size={16} />
                성적서 PDF 발행
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
