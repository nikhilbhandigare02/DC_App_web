import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDcRejectedCases } from '../../api/reportUploadApi';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PaginationBar } from '../../components/ui/PaginationBar';
import { usePagination } from '../../utils/usePagination';
import { IconChevronRight } from '../../components/icons';
import { toast } from '../../lib/toast';
import type { DcRejectedCase } from '../../types/report';

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

/** Formats the API's ISO or `M/d/yyyy h:mm:ss AM` date as `dd-MM-yyyy`; falls back to the raw text. */
function formatApiDate(raw?: string): string {
  if (!raw) return '—';
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim());
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(raw.trim());
  if (!m) return raw;
  return `${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}-${m[3]}`;
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9.5px] font-bold uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className="mt-0.5 truncate text-[12.5px] font-semibold text-text-primary">{value}</p>
    </div>
  );
}

/**
 * "DC Discrepancy" — one card per case QC rejected, from
 * `GetDCRejectedCasesByQc`. Ported from the mobile `DiscrepancyListBody`;
 * clicking a card opens that case's documents.
 */
export function DcDiscrepancyPage() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<DcRejectedCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  async function load() {
    setIsLoading(true);
    setLoadError(null);
    try {
      setCases(await getDcRejectedCases());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load the discrepancy list. Please try again.';
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return cases;
    return cases.filter(
      (c) =>
        String(c.caseId ?? '').includes(query) ||
        String(c.appointmentId ?? '').includes(query) ||
        (c.companyName ?? '').toLowerCase().includes(query) ||
        (c.clientName ?? '').toLowerCase().includes(query),
    );
  }, [cases, searchQuery]);

  const { currentPage, totalPages, pageItems, setPage, totalItems } = usePagination(filtered);

  function openCase(c: DcRejectedCase) {
    navigate(
      `/home/dc-discrepancy/documents/${c.caseId}/${c.appointmentId}?clientName=${encodeURIComponent(c.clientName || `Case ${c.caseId}`)}&insurance=${encodeURIComponent(c.companyName ?? '')}`,
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="DC Discrepancy" description="Cases with documents rejected by QC." />

      <Card>
        <Input
          placeholder="Search by name, case ID, appointment ID or insurance..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<SearchIcon />}
        />
      </Card>

      {isLoading ? (
        <Card>
          <div className="flex items-center gap-2 py-8 text-sm text-text-secondary">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-divider border-t-primary" />
            Loading discrepancies...
          </div>
        </Card>
      ) : loadError ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-text-secondary">{loadError}</p>
            <Button variant="secondary" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <p className="text-[13px] font-extrabold uppercase tracking-wide text-text-secondary">
            {filtered.length} appointment(s) with discrepancies
          </p>
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-tertiary">
              {cases.length === 0 ? 'No discrepancies found.' : 'No discrepancies match your search.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2 2xl:grid-cols-3">
              {pageItems.map((c) => (
                <button
                  key={`${c.reportUploadId}-${c.caseId}-${c.appointmentId}`}
                  type="button"
                  onClick={() => openCase(c)}
                  className="flex items-start gap-3 rounded-xl border border-divider bg-surface p-4 text-left shadow-sm transition hover:border-primary/30 hover:bg-primary-pale/40 hover:shadow-md"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-extrabold text-text-primary">{c.clientName || `Case #${c.caseId}`}</p>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
                      {/* <InfoField label="Case ID" value={String(c.caseId ?? '—')} /> */}
                      <InfoField label="Appointment ID" value={String(c.appointmentId ?? '—')} />
                      {/* <InfoField label="Insurance" value={c.companyName || '—'} /> */}
                      <InfoField label="Appointment Date" value={formatApiDate(c.appointmentDate)} />
                    </div>
                  </div>
                  <span className="mt-0.5 text-text-tertiary">
                    <IconChevronRight size={18} />
                  </span>
                </button>
              ))}
            </div>
          )}
          {totalItems > 0 && (
            <PaginationBar currentPage={currentPage} totalPages={totalPages} onPageSelected={setPage} totalItems={totalItems} />
          )}
        </>
      )}
    </div>
  );
}
