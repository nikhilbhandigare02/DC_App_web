import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAppointmentDetailsById } from '../../../api/appointmentApi';
import { Modal } from '../../../components/ui/Modal';
import { Badge, type BadgeTone } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { toast } from '../../../lib/toast';
import { formatDate, mapAppointmentDetailsToModels, type AppointmentUIModel } from '../types';

interface FieldDef {
  label: string;
  value: string;
}

function fieldsFor(item: AppointmentUIModel): FieldDef[] {
  return [
    { label: 'Case ID', value: item.caseId || '—' },
    { label: 'Proposal No.', value: item.proposalNo || '—' },
    { label: 'Client Profile', value: item.clientProfile || '—' },
    { label: 'Visit Type', value: item.visitType || '—' },
    { label: 'Gender', value: item.gender || '—' },
    { label: 'Age', value: item.age ? `${item.age} yrs` : '—' },
    { label: 'Mobile No.', value: item.mobileNo || '—' },
    { label: 'Insurance', value: item.insuranceCompany || '—' },
    { label: 'Date & Time', value: `${formatDate(item.date)} · ${item.time}` },
    { label: 'Tests', value: item.test || '—' },
  ];
}

function statusTone(status: string): BadgeTone {
  switch (status.toLowerCase()) {
    case 'fixed':
    case 'completed':
      return 'success';
    case 'confirmed':
      return 'info';
    case 'pending':
      return 'warning';
    case 'cancelled':
    case 'canceled':
      return 'error';
    default:
      return 'neutral';
  }
}

interface AppointmentDetailModalProps {
  item: AppointmentUIModel;
  onClose: () => void;
}

/**
 * Appointment details dialog — fetches the up-to-date record via
 * `GetAppointmentDetailsById` in the background while showing the row
 * already on hand, ported from `showAppointmentDetailsDialog` /
 * `AppointmentDetailContent` (appointment_detail_view.dart). Migrated to
 * the shared `Modal` primitive with a clean label/value grid.
 */
export function AppointmentDetailModal({ item, onClose }: AppointmentDetailModalProps) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(item);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const appointmentId = Number(item.appointmentId);
    const caseId = Number(item.caseId);
    if (!Number.isFinite(appointmentId) && !Number.isFinite(caseId)) {
      setIsLoading(false);
      return;
    }

    async function load() {
      setIsLoading(true);
      try {
        const details = await getAppointmentDetailsById(
          Number.isFinite(caseId) ? caseId : undefined,
          Number.isFinite(appointmentId) ? appointmentId : undefined,
        );
        const mapped = mapAppointmentDetailsToModels(details);
        if (cancelled) return;
        if (mapped.length > 0) setCurrent(mapped[0]);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Could not refresh details.';
          toast.error(`Could not refresh details: ${message}`);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.appointmentId, item.caseId]);

  function handleStart() {
    // An empty `appointmentId` would build a path like `/home/appointments//client-info`,
    // which doesn't match the `:appointmentId` route and silently bounces to the home
    // screen via the catch-all redirect — guard against that instead.
    if (!current.appointmentId) {
      toast.error('This appointment can’t be opened yet — no appointment ID was returned.');
      return;
    }
    navigate(`/home/appointments/${encodeURIComponent(current.appointmentId)}/client-info?caseId=${encodeURIComponent(current.caseId)}`);
  }

  return (
    <Modal
      open
      onClose={onClose}
      width={560}
      title={
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-appointment-accent to-appointment-accent/70 text-[13px] font-bold text-white shadow-[0_2px_8px_-1px_rgba(108,92,231,0.55)]">
            {current.patientName.trim() ? current.patientName.trim()[0].toUpperCase() : '?'}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-text-primary">{current.patientName || '—'}</p>
            <p className="text-[11px] text-text-tertiary">Case ID · {current.caseId || '—'}</p>
          </div>
          <Badge tone={statusTone(current.status)}>{current.status}</Badge>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Missed
          </Button>
          <Button variant="primary" onClick={handleStart}>
            Start
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-10">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            {fieldsFor(current).map((field) => (
              <div key={field.label}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">{field.label}</p>
                <p className="mt-0.5 text-[13px] font-medium text-text-primary">{field.value}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
