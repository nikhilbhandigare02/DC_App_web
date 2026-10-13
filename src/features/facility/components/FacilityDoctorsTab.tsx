/**
 * "Facility Doctors" section — ported from `FacilityDoctorsCard` in
 * `lib/screens/facility/widgets/facility_sections.dart`.
 *
 * "Remove" asks for confirmation, then sends `DeleteDoctorRequest` (a removal request
 * recorded for approval; the doctor is not deactivated) and reloads the list.
 */

import { useCallback, useEffect, useState } from 'react';
import { deleteDoctorRequest, getProviderDoctorDetails } from '../../../api/doctorApi';
import { Badge, type BadgeTone } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { IconClose, IconStethoscope, IconWarning } from '../../../components/icons';
import { Drawer } from '../../../components/ui/Drawer';
import { Modal } from '../../../components/ui/Modal';
import { DocumentPreviewModal } from '../../../components/ui/DocumentPreviewModal';
import { Panel } from '../../../components/ui/Panel';
import { Table, type TableColumn } from '../../../components/ui/Table';
import type { ProviderDoctorDetail } from '../../../types/doctor';
import { toast } from '../../../lib/toast';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { usePagination } from '../../../utils/usePagination';
import { ApiError } from '../../../lib/apiClient';
import { resolveEmpanelmentMastId } from '../utils';
import { AddDoctorForm } from './AddDoctorForm';
import { IconPlus, IconTrash } from './icons';

interface DoctorRow {
  key: string;
  doctor: ProviderDoctorDetail;
}

const AVATAR_TONES = ['bg-primary-pale text-primary', 'bg-info-pale text-info', 'bg-success-pale text-success', 'bg-warning-pale text-warning'];

/** Badge colour for a request status such as "DC Requested", "Approved" or "Rejected". */
function statusTone(status: string): BadgeTone {
  const key = status.toLowerCase();
  if (key.includes('reject')) return 'error';
  if (key.includes('approv') || key.includes('complete')) return 'success';
  if (key.includes('request') || key.includes('pending') || key.includes('process')) return 'warning';
  return 'info';
}

function avatarTone(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i)) % AVATAR_TONES.length;
  return AVATAR_TONES[hash];
}

export function FacilityDoctorsTab() {
  const [doctors, setDoctors] = useState<ProviderDoctorDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** The doctor waiting for the remove confirmation, and whether the remove request is running. */
  const [removing, setRemoving] = useState<ProviderDoctorDetail | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  /** The doctor whose row was clicked — opens the same form pre-filled, to update it. */
  const [editingDoctor, setEditingDoctor] = useState<ProviderDoctorDetail | null>(null);
  /** The doctor whose certificate is open in the preview. */
  const [previewDoctor, setPreviewDoctor] = useState<ProviderDoctorDetail | null>(null);
  /** The header's search icon swaps the title for a search box. */
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');

  const rowKeyFor = (d: ProviderDoctorDetail, index: number) => `${d.doctorId ?? 'x'}-${d.doctorName ?? ''}-${index}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProviderDoctorDetails();
      setDoctors(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load facility doctors. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Sends the removal request (a pending approval row, status 114; the doctor is not deactivated) and reloads the list. */
  async function confirmRemove() {
    if (!removing || removing.doctorId == null) return;
    setRemoveBusy(true);
    try {
      await deleteDoctorRequest({ empanelmentMastId: resolveEmpanelmentMastId(), doctorMastId: removing.doctorId });
      toast.success('Doctor removal request submitted for approval.');
      setRemoving(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not remove the doctor.');
    } finally {
      setRemoveBusy(false);
    }
  }

  function toggleSearch() {
    setShowSearch((open) => !open);
    setSearch('');
  }

  const query = search.trim().toLowerCase();
  const rows: DoctorRow[] = doctors
    .map((doctor, index) => ({ key: rowKeyFor(doctor, index), doctor }))
    .filter(({ doctor: d }) => {
      if (!query) return true;
      return [d.doctorName, d.doctorType, d.speciality, d.qualification, d.contactNo, d.medicalRegistrationNo].some((v) =>
        (v ?? '').toLowerCase().includes(query),
      );
    });

  const { currentPage, totalPages, pageItems, setPage, totalItems } = usePagination(rows);

  const columns: TableColumn<DoctorRow>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      sortValue: (row) => row.doctor.doctorName ?? '',
      render: (row) => {
        const name = row.doctor.doctorName || '—';
        const initial = row.doctor.doctorName?.trim()?.[0]?.toUpperCase() ?? '?';
        return (
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarTone(name)}`}
            >
              {initial}
            </span>
            <span className="font-medium text-text-primary">{name}</span>
          </div>
        );
      },
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (row) => <span className="text-text-secondary">{row.doctor.contactNo || '—'}</span>,
    },
    {
      key: 'medicalRegNo',
      header: 'Medical Reg. No.',
      render: (row) => <span className="text-text-secondary">{row.doctor.medicalRegistrationNo || '—'}</span>,
    },
    {
      key: 'qualification',
      header: 'Qualification',
      render: (row) => <span className="text-text-secondary">{row.doctor.qualification || '—'}</span>,
    },
    {
      key: 'specialty',
      header: 'Specialty',
      sortable: true,
      sortValue: (row) => row.doctor.speciality ?? row.doctor.doctorType ?? '',
      render: (row) => {
        const specialty = row.doctor.speciality || row.doctor.doctorType;
        return specialty ? <Badge tone="info">{specialty}</Badge> : <span className="text-text-tertiary">—</span>;
      },
    },
    {
      key: 'dates',
      header: 'Effective / To',
      render: (row) => (
        <span className="whitespace-nowrap text-text-secondary">
          {row.doctor.fromDate || '—'} <span className="text-text-tertiary">→</span> {row.doctor.toDate || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortValue: (row) => row.doctor.status ?? '',
      render: (row) =>
        row.doctor.status ? <Badge tone={statusTone(row.doctor.status)}>{row.doctor.status}</Badge> : <span className="text-text-tertiary">—</span>,
    },
    {
      key: 'document',
      header: 'Document',
      render: (row) =>
        row.doctor.newFileName ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewDoctor(row.doctor);
            }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            View document
          </button>
        ) : (
          <span className="text-text-tertiary">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '64px',
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setRemoving(row.doctor);
          }}
          aria-label={`Remove ${row.doctor.doctorName ?? 'doctor'}`}
          title="Remove"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-error-pale hover:text-error"
        >
          <IconTrash size={15} />
        </button>
      ),
    },
  ];

  return (
    <Panel noPadding>
      <div className="flex items-center justify-between gap-3 border-b border-divider bg-gradient-to-r from-primary-pale/30 to-transparent px-4 py-3.5">
        {showSearch ? (
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, specialty, contact..."
            className="min-w-0 flex-1 rounded-md border border-divider bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          />
        ) : (
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary-light to-primary text-white shadow-sm shadow-primary/40">
              <IconStethoscope size={18} />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-text-primary">Facility Doctors</h2>
              <p className="mt-0.5 text-xs text-text-tertiary">Doctors empanelled at this diagnostic centre.</p>
            </div>
          </div>
        )}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label={showSearch ? 'Close search' : 'Search doctors'}
            title={showSearch ? 'Close search' : 'Search'}
            onClick={toggleSearch}
            className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
              showSearch
                ? 'border-primary/40 bg-primary-pale text-primary'
                : 'border-divider bg-surface text-text-secondary hover:bg-surface-variant'
            }`}
          >
            {showSearch ? (
              <IconClose size={15} />
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            )}
          </button>
          <Button size="sm" icon={<IconPlus size={14} />} onClick={() => setShowAddDoctor(true)}>
            Add Doctor
          </Button>
        </div>
      </div>

      {error && !loading ? (
        <div className="flex items-center gap-3 px-4 py-8">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-error-pale to-error/20 text-error shadow-sm shadow-error/20">
            <IconWarning size={16} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">Could not load doctors</p>
          </div>
          <Button size="sm" variant="secondary" onClick={load}>
            Retry
          </Button>
        </div>
      ) : (
        <>
        <Table
          columns={columns}
          data={pageItems}
          rowKey={(row) => row.key}
          onRowClick={(row) => setEditingDoctor(row.doctor)}
          isLoading={loading}
          emptyState={
            <div className="flex flex-col items-center gap-2 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-pale to-accent-pale/60 text-primary">
                <IconStethoscope size={18} />
              </span>
              <p className="text-sm font-medium text-text-primary">No doctors added yet</p>
              <p className="text-xs text-text-tertiary">Add the first empanelled doctor for this centre.</p>
              <Button size="sm" variant="secondary" icon={<IconPlus size={14} />} className="mt-1" onClick={() => setShowAddDoctor(true)}>
                Add Doctor
              </Button>
            </div>
          }
          className="rounded-none border-0"
        />
        {totalItems > 0 && (
          <div className="border-t border-divider py-3">
            <PaginationBar currentPage={currentPage} totalPages={totalPages} onPageSelected={setPage} totalItems={totalItems} />
          </div>
        )}
        </>
      )}

      <Modal
        open={removing !== null}
        onClose={() => (removeBusy ? undefined : setRemoving(null))}
        width={400}
        title="Request doctor removal?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)} disabled={removeBusy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmRemove} isLoading={removeBusy}>
              Send request
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          A removal request for {removing?.doctorName ?? 'this doctor'} will be sent for approval. The doctor stays in the list until it is approved.
        </p>
      </Modal>

      <DocumentPreviewModal
        label={previewDoctor ? `${previewDoctor.doctorName ?? 'Doctor'} — certificate` : null}
        onClose={() => setPreviewDoctor(null)}
        imageUrl={previewDoctor?.newFilePath}
        fileName={previewDoctor?.newFileName}
        openUrl={previewDoctor?.newFilePath}
      />

      <Drawer open={showAddDoctor} onClose={() => setShowAddDoctor(false)} title="Add Doctor" width={520}>
        <AddDoctorForm
          onClose={() => setShowAddDoctor(false)}
          onSaved={() => {
            setShowAddDoctor(false);
            load();
            toast.success('Doctor list refreshed.');
          }}
        />
      </Drawer>

      <Drawer open={editingDoctor !== null} onClose={() => setEditingDoctor(null)} title="Edit Doctor" width={520}>
        {editingDoctor && (
          <AddDoctorForm
            // Remount per doctor so the form always starts from that row's data.
            key={editingDoctor.doctorId ?? editingDoctor.doctorName}
            doctor={editingDoctor}
            onClose={() => setEditingDoctor(null)}
            onSaved={() => {
              setEditingDoctor(null);
              load();
              toast.success('Doctor list refreshed.');
            }}
          />
        )}
      </Drawer>
    </Panel>
  );
}
