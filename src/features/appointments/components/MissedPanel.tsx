import { useEffect, useState } from 'react';
import { getMissedStatuses, saveMissedAppointment, type MissedStatusRow } from '../../../api/reportUploadApi';
import { Button } from '../../../components/ui/Button';
import { toast } from '../../../lib/toast';
import type { AppointmentUIModel } from '../types';

type Outcome = 'recall' | 'nnr';

interface MissedPanelProps {
  item: AppointmentUIModel;
  /** Back to the appointment details. */
  onBack: () => void;
  /** Called after the missed appointment was saved. */
  onDone: () => void;
}

const RECALL_STATUS_ID = 9;
const RECALL_SUB_STATUS_ID = 12;
const NON_CONTACTABLE_STATUS_ID = 10;

/**
 * What "Missed" shows inside the appointment dialog: give the appointment a
 * Recall (callback date + time) or NNR (Non Contactable). Saved as a No Show
 * (27/55) moving to the chosen status — same as the Show/No Show follow-up.
 */
export function MissedPanel({ item, onBack, onDone }: MissedPanelProps) {
  const [rows, setRows] = useState<MissedStatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [outcome, setOutcome] = useState<Outcome>('recall');
  const [recallDate, setRecallDate] = useState('');
  const [recallTime, setRecallTime] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMissedStatuses()
      .then((list) => {
        if (!cancelled) setRows(list);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Could not load the statuses.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Recall = status 9 / sub status 12; NNR = Non Contactable (10) with the sub status picked below.
  const recall = rows.find((r) => r.statusId === RECALL_STATUS_ID && r.subStatusId === RECALL_SUB_STATUS_ID);
  const nonContactable = rows.filter((r) => r.statusId === NON_CONTACTABLE_STATUS_ID);
  const [nnrSubStatusId, setNnrSubStatusId] = useState('');
  const nnr = nonContactable.find((r) => String(r.subStatusId) === nnrSubStatusId);
  const chosen = outcome === 'recall' ? recall : nnr;

  async function handleSave() {
    if (submitting) return;
    if (outcome === 'nnr' && !nnrSubStatusId) {
      toast.error('Select the sub status.');
      return;
    }
    if (!chosen) {
      toast.error('This option is not available. Please contact support.');
      return;
    }
    if (outcome === 'recall') {
      if (!recallDate || !recallTime) {
        toast.error('Select the recall date and time.');
        return;
      }
      if (new Date(`${recallDate}T${recallTime}:00`).getTime() <= Date.now()) {
        toast.error('The recall date and time must be in the future.');
        return;
      }
    }
    setSubmitting(true);
    try {
      await saveMissedAppointment({
        caseId: Number(item.caseId),
        appointmentId: Number(item.appointmentId),
        statusId: chosen.statusId,
        subStatusId: chosen.subStatusId,
        remarks: remarks.trim(),
        ...(outcome === 'recall' ? { recallDate, recallTime } : {}),
      });
      toast.success(outcome === 'recall' ? 'Recall scheduled successfully' : 'Marked as NNR successfully');
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const optionClass = (active: boolean) =>
    `flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 text-[13px] font-semibold ${
      active ? 'border-primary bg-primary/5 text-primary' : 'border-divider text-text-primary'
    }`;

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <div className="flex justify-center py-10">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className={optionClass(outcome === 'recall')}>
              <input type="radio" name="missed-outcome" checked={outcome === 'recall'} onChange={() => setOutcome('recall')} />
              Recall
            </label>
            <label className={optionClass(outcome === 'nnr')}>
              <input type="radio" name="missed-outcome" checked={outcome === 'nnr'} onChange={() => setOutcome('nnr')} />
              NNR (Non Contactable)
            </label>
          </div>

          {outcome === 'nnr' && (
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-semibold text-text-primary">
                Status: {nonContactable[0]?.statusName || 'Non Contactable'} · Sub Status
              </label>
              <select
                value={nnrSubStatusId}
                onChange={(e) => setNnrSubStatusId(e.target.value)}
                className="rounded-md border border-divider bg-white px-2 py-1.5 text-[13px]"
              >
                <option value="">Select sub status</option>
                {nonContactable.map((r) => (
                  <option key={r.subStatusId} value={r.subStatusId}>
                    {r.subStatusName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {outcome === 'recall' && recall && (
            <p className="text-[12px] text-text-secondary">
              Status: <span className="font-semibold text-text-primary">{recall.statusName}</span> · Sub Status:{' '}
              <span className="font-semibold text-text-primary">{recall.subStatusName}</span>
            </p>
          )}

          {outcome === 'recall' && (
            <div className="flex flex-wrap gap-3 rounded-lg border-2 border-primary bg-primary/5 p-3">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-semibold text-text-primary">Recall Date</label>
                <input
                  type="date"
                  value={recallDate}
                  min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)}
                  onChange={(e) => setRecallDate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Tab') e.preventDefault();
                  }}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  className="cursor-pointer rounded-md border border-divider bg-white px-2 py-1.5 text-[13px]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-semibold text-text-primary">Recall Time</label>
                <input
                  type="time"
                  value={recallTime}
                  onChange={(e) => setRecallTime(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Tab') e.preventDefault();
                  }}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  className="cursor-pointer rounded-md border border-divider bg-white px-2 py-1.5 text-[13px]"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-semibold text-text-primary">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              className="rounded-md border border-divider px-2 py-1.5 text-[13px]"
            />
          </div>
        </>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-divider pt-3">
        <Button variant="secondary" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button onClick={() => void handleSave()} isLoading={submitting} disabled={loading}>
          Save
        </Button>
      </div>
    </div>
  );
}
