/**
 * "Facility Doctors" section — ported from `FacilityDoctorsCard` in
 * `lib/screens/facility/widgets/facility_sections.dart`.
 *
 * The backend has no delete endpoint for a doctor row (only
 * `GetProviderDoctorDetails`/`SaveDoctorDetails` exist), so — mirroring the
 * Dart bloc's `FacilityDoctorRemoved`, which only updates local state —
 * "remove" here only hides the row from this session's list.
 */

import { useCallback, useEffect, useState } from 'react';
import { getProviderDoctorDetails } from '../../../api/doctorApi';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { IconStethoscope, IconWarning } from '../../../components/icons';
import { Drawer } from '../../../components/ui/Drawer';
import { Panel } from '../../../components/ui/Panel';
import { Table, type TableColumn } from '../../../components/ui/Table';
import type { ProviderDoctorDetail } from '../../../types/doctor';
import { toast } from '../../../lib/toast';
import { AddDoctorForm } from './AddDoctorForm';
import { IconPlus, IconTrash } from './icons';

interface DoctorRow {
  key: string;
  doctor: ProviderDoctorDetail;
}

const AVATAR_TONES = ['bg-primary-pale text-primary', 'bg-info-pale text-info', 'bg-success-pale text-success', 'bg-warning-pale text-warning'];

function avatarTone(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i)) % AVATAR_TONES.length;
  return AVATAR_TONES[hash];
}

export function FacilityDoctorsTab() {
  const [doctors, setDoctors] = useState<ProviderDoctorDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(new Set());
  const [showAddDoctor, setShowAddDoctor] = useState(false);

  const rowKeyFor = (d: ProviderDoctorDetail, index: number) => `${d.doctorId ?? 'x'}-${d.doctorName ?? ''}-${index}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProviderDoctorDetails();
      setDoctors(data);
      setRemovedKeys(new Set());
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

  function removeRow(key: string) {
    setRemovedKeys((prev) => new Set(prev).add(key));
  }

  const rows: DoctorRow[] = doctors
    .map((doctor, index) => ({ key: rowKeyFor(doctor, index), doctor }))
    .filter((row) => !removedKeys.has(row.key));

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
      key: 'actions',
      header: '',
      align: 'right',
      width: '64px',
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removeRow(row.key);
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
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary-light to-primary text-white shadow-sm shadow-primary/40">
            <IconStethoscope size={18} />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary">Facility Doctors</h2>
            <p className="mt-0.5 text-xs text-text-tertiary">Doctors empanelled at this diagnostic centre.</p>
          </div>
        </div>
        <Button size="sm" icon={<IconPlus size={14} />} onClick={() => setShowAddDoctor(true)}>
          Add Doctor
        </Button>
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
        <Table
          columns={columns}
          data={rows}
          rowKey={(row) => row.key}
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
      )}

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
    </Panel>
  );
}
