import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, XCircle, FileText, Download, Eye, Table as TableIcon, ExternalLink, Copy, Check, AlertTriangle, ShieldAlert } from 'lucide-react';

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

interface CustomerOption {
  id: number;
  customer: string;
  product: string;
  template_name: string;
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
  const [activeTab, setActiveTab] = useState<'table' | 'pdf'>('table');
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('삼양화성');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [copied, setCopied] = useState<boolean>(false);
  const [confirmForceModalOpen, setConfirmForceModalOpen] = useState<boolean>(false);
  const [forceApproved, setForceApproved] = useState<boolean>(false);

  const handleCopyMisData = async () => {
    if (!data) return;
    try {
      // 11개 표준 항목 순서
      const targetColumns = [
        "Appearance", "Freezing Point", "Melt Color", "Solution Color (Alcohol)",
        "Solution Color (Alkali)", "BPA Purity (dry)", "Phenol", "2,4'-BPA",
        "Water", "Iron", "Ash"
      ];
      const vals = targetColumns.map(col => {
        for (const [k, v] of Object.entries(data.items)) {
          if (k.toLowerCase().includes(col.toLowerCase()) || col.toLowerCase().includes(k.toLowerCase())) {
            return v.value;
          }
        }
        return '-';
      });

      // 탭 구분자 TSV (엑셀 및 사내 MIS 1행 복사용)
      const tsvText = vals.join('\t');
      await navigator.clipboard.writeText(tsvText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.error('Failed to copy MIS data:', e);
      alert('클립보드 복사 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetch('/api/reports/customers')
        .then(res => res.json())
        .then(d => {
          if (Array.isArray(d)) {
            setCustomers(d);
            if (d.length > 0 && !selectedCustomer) {
              setSelectedCustomer(d[0].customer);
            }
          }
        })
        .catch(err => console.error('Failed to load customers:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isSpecFailed = data ? !data.is_all_passed : false;
  const isBlocked = isSpecFailed && !forceApproved;

  const pdfUrl = data
    ? `/api/reports/lot/${data.lot_no}/pdf?customer_name=${encodeURIComponent(selectedCustomer)}&issue_date=${issueDate}${forceApproved ? '&force_issue=true' : ''}`
    : '';

  const downloadUrl = data
    ? `/api/reports/lot/${data.lot_no}/pdf?customer_name=${encodeURIComponent(selectedCustomer)}&issue_date=${issueDate}&download=true${forceApproved ? '&force_issue=true' : ''}`
    : '';

  const failedItemList = data
    ? Object.entries(data.items).filter(([_, item]) => !item.passed)
    : [];

  const handleAttemptPrint = () => {
    if (isBlocked) {
      setConfirmForceModalOpen(true);
      return;
    }
    window.open(pdfUrl, '_blank');
  };

  const handleAttemptDownload = (e: React.MouseEvent) => {
    if (isBlocked) {
      e.preventDefault();
      setConfirmForceModalOpen(true);
      return;
    }
  };

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
        maxWidth: activeTab === 'pdf' ? '960px' : '840px',
        width: '100%',
        height: '92vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#111827',
        border: '1px solid #374151',
        padding: '20px 24px',
        transition: 'all 0.25s ease'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #374151', paddingBottom: '14px', marginBottom: '14px' }}>
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
                  성적서 발행 및 품질분석 뷰어
                </h2>
                {data && (
                  <span className={`badge ${data.is_all_passed ? 'badge-success' : 'badge-warning'}`}>
                    {data.is_all_passed ? '규격 적합 (PASS)' : '규격 미달 (FAIL)'}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>
                오즈 레포트 뷰어 형식의 실시간 인쇄/다운로드 및 규격 판정표
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ padding: '6px 10px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Control & Tab Bar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(31, 41, 55, 0.5)',
          padding: '8px 12px',
          borderRadius: '8px',
          marginBottom: '14px',
          border: '1px solid rgba(55, 65, 81, 0.5)'
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setActiveTab('table')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                background: activeTab === 'table' ? '#3B82F6' : 'transparent',
                color: activeTab === 'table' ? '#FFFFFF' : '#9CA3AF',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <TableIcon size={14} />
              품질 규격 분석표
            </button>
            <button
              onClick={() => setActiveTab('pdf')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                background: activeTab === 'pdf' ? '#3B82F6' : 'transparent',
                color: activeTab === 'pdf' ? '#FFFFFF' : '#9CA3AF',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Eye size={14} />
              공식 성적서 뷰어 (PDF)
            </button>
          </div>

          {/* Customer & Date Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78125rem', color: '#9CA3AF' }}>출하선(고객사):</span>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                style={{
                  background: '#1F2937',
                  border: '1px solid #4B5563',
                  color: '#F9FAFB',
                  fontSize: '0.8125rem',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.customer}>
                    {c.customer}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78125rem', color: '#9CA3AF' }}>발행일:</span>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                style={{
                  background: '#1F2937',
                  border: '1px solid #4B5563',
                  color: '#F9FAFB',
                  fontSize: '0.8125rem',
                  padding: '3px 6px',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
            분석 데이터 및 성적서를 불러오는 중입니다...
          </div>
        )}

        {!loading && data && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {activeTab === 'table' ? (
              <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                {/* Meta Summary Bar */}
                <div style={{
                  background: '#1F2937',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '16px',
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
                <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
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
              </div>
            ) : (
              /* PDF Viewer Frame */
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0 }}>
                <iframe
                  title="성적서 PDF 뷰어"
                  src={pdfUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    background: '#FFFFFF'
                  }}
                />
              </div>
            )}

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #374151', paddingTop: '14px', marginTop: '10px' }}>
              <div style={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>
                선택된 서식: <strong>{selectedCustomer}</strong> ({customers.find(c => c.customer === selectedCustomer)?.template_name || '기본 서식'})
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleCopyMisData}
                  style={{
                    gap: '6px',
                    background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(55, 65, 81, 0.6)',
                    borderColor: copied ? '#10B981' : '#4B5563',
                    color: copied ? '#34D399' : '#F3F4F6',
                    transition: 'all 0.2s ease'
                  }}
                  title="MIS 전산 또는 엑셀에 Ctrl+V로 즉시 붙여넣을 수 있는 11개 분석 수치를 복사합니다."
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? 'MIS 수치 복사 완료!' : 'MIS 데이터 복사 (Excel용)'}
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={handleAttemptPrint}
                  style={{
                    gap: '6px',
                    borderColor: isBlocked ? 'rgba(239, 68, 68, 0.5)' : undefined,
                    color: isBlocked ? '#F87171' : undefined
                  }}
                  title={isBlocked ? "규격 부적합 항목이 있어 발행이 잠겨 있습니다." : "새 창으로 열기 및 인쇄"}
                >
                  {isBlocked ? <AlertTriangle size={15} /> : <ExternalLink size={15} />}
                  {isBlocked ? '출력 락(Lock) 확인' : '새 창으로 열기 / 인쇄'}
                </button>
                <a
                  href={isBlocked ? '#' : downloadUrl}
                  onClick={handleAttemptDownload}
                  download={isBlocked ? undefined : `${selectedCustomer}_${data.lot_no}_성적서.pdf`}
                  className={`btn ${isBlocked ? 'btn-secondary' : 'btn-primary'}`}
                  style={{
                    gap: '6px',
                    textDecoration: 'none',
                    background: isBlocked ? 'rgba(239, 68, 68, 0.15)' : undefined,
                    borderColor: isBlocked ? '#EF4444' : undefined,
                    color: isBlocked ? '#FCA5A5' : undefined
                  }}
                  title={isBlocked ? "규격 부적합 항목이 있어 다운로드가 잠겨 있습니다." : "성적서 PDF 파일 다운로드"}
                >
                  <Download size={15} />
                  {isBlocked ? '규격 미달 (발행 제한)' : '성적서 PDF 다운로드'}
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 방안 2: 사전 검증 경고 및 강제 발행 확인 모달 */}
      {confirmForceModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '520px',
            width: '100%',
            background: '#1F2937',
            borderRadius: '12px',
            border: '2px solid #EF4444',
            boxShadow: '0 20px 25px -5px rgba(239, 68, 68, 0.3)',
            overflow: 'hidden'
          }}>
            <div style={{
              background: '#DC2626',
              padding: '16px 20px',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <ShieldAlert size={28} />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>
                  성적서 발행 사전 차단 (Spec Out 경고)
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8125rem', opacity: 0.9 }}>
                  품질 규격 미달 항목이 감지되어 자동 발행이 인터락되었습니다.
                </p>
              </div>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F87171', marginBottom: '8px' }}>
                  미달 항목 내역 ({failedItemList.length}건):
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8125rem', color: '#E5E7EB' }}>
                  {failedItemList.map(([name, item]) => (
                    <li key={name} style={{ marginBottom: '4px' }}>
                      <strong>{name}</strong>: 측정치 <span style={{ color: '#F87171', fontWeight: 700 }}>{item.value} {item.unit}</span> (기준 규격: {item.spec})
                    </li>
                  ))}
                </ul>
              </div>

              <p style={{ fontSize: '0.8125rem', color: '#D1D5DB', lineHeight: 1.5, marginBottom: '20px' }}>
                🚨 <strong>[오발행 주의 안내]</strong><br />
                정상 범위를 벗어난 성적서가 고객사에 전달되지 않도록 출력이 제한되었습니다. 삼양 담당자의 사전 승인 하에 예외 발행을 진행하는 경우, <strong>즉시 담당자 메일로 [긴급 오발행 주의 알림]이 실시간 발송</strong>되며 발행 이력에 강제 발행 사유가 영구 기록됩니다.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setConfirmForceModalOpen(false)}
                  style={{ fontSize: '0.8125rem' }}
                >
                  발행 취소 (돌아가기)
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setForceApproved(true);
                    setConfirmForceModalOpen(false);
                  }}
                  style={{
                    fontSize: '0.8125rem',
                    background: '#DC2626',
                    borderColor: '#B91C1C',
                    fontWeight: 700
                  }}
                >
                  사유 확인 후 강제 발행 (담당자 즉시 알림)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
