/**
 * "Add Doctor" form — ported from `lib/screens/facility/widgets/add_doctor_sheet.dart`
 * and `lib/bloc/AddDoctorBloc/*`. Rendered as content inside the shared
 * `Drawer` (see `FacilityDoctorsTab`), matching how `FacilityEntryCard`
 * hosts its own form — forms use the side `Drawer`, never the centered
 * `Modal` dialog.
 */

import { useEffect, useState, type FormEvent } from 'react';
import { getDoctorSpecialization, getDoctorType } from '../../../api/ddlApi';
import { saveDoctor } from '../../../api/doctorApi';
import { uploadDocuments } from '../../../api/fileUploadApi';
import { toast } from '../../../lib/toast';
import { ApiError } from '../../../lib/apiClient';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { IconBadge, IconCalendar, IconFileUp, IconPhone, IconStethoscope, IconUser } from '../../../components/icons';
import type { ReactNode } from 'react';
import type { DdlOptionModel } from '../../../types/ddl';
import { defaultDateInputValue, resolveEmpanelmentMastId } from '../utils';

// Matches `AddDoctorBloc.doctorCertificateDocumentType`.
const DOCTOR_CERTIFICATE_DOCUMENT_TYPE = 1;

/** Small colored icon badge + label used above each form section, purely for visual grouping. */
function SectionHeading({ tone, icon, children }: { tone: 'primary' | 'accent' | 'gold'; icon: ReactNode; children: ReactNode }) {
  const toneClasses: Record<'primary' | 'accent' | 'gold', string> = {
    primary: 'bg-gradient-to-br from-primary-light to-primary text-white shadow-sm shadow-primary/30',
    accent: 'bg-gradient-to-br from-accent-light to-accent text-white shadow-sm shadow-accent/30',
    gold: 'bg-gradient-to-br from-gold to-gold/70 text-white shadow-sm shadow-gold/30',
  };
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${toneClasses[tone]}`}>{icon}</span>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">{children}</p>
    </div>
  );
}

interface AddDoctorFormProps {
  onClose: () => void;
  onSaved: () => void;
}

export function AddDoctorForm({ onClose, onSaved }: AddDoctorFormProps) {
  const today = defaultDateInputValue();

  const [doctorTypes, setDoctorTypes] = useState<DdlOptionModel[]>([]);
  const [doctorTypesLoading, setDoctorTypesLoading] = useState(true);
  const [doctorTypesError, setDoctorTypesError] = useState<string | null>(null);

  const [specialties, setSpecialties] = useState<DdlOptionModel[]>([]);
  const [specialtiesLoading, setSpecialtiesLoading] = useState(true);
  const [specialtiesError, setSpecialtiesError] = useState<string | null>(null);

  const [type, setType] = useState('');
  const [name, setName] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [medicalRegistrationNo, setMedicalRegistrationNo] = useState('');
  const [qualification, setQualification] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [certificate, setCertificate] = useState<File | null>(null);
  const [certificateDragOver, setCertificateDragOver] = useState(false);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const options = await getDoctorType();
        if (!cancelled) setDoctorTypes(options);
      } catch (err) {
        if (!cancelled) setDoctorTypesError(err instanceof Error ? err.message : 'Could not load speciality types.');
      } finally {
        if (!cancelled) setDoctorTypesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const options = await getDoctorSpecialization();
        if (!cancelled) setSpecialties(options);
      } catch (err) {
        if (!cancelled) setSpecialtiesError(err instanceof Error ? err.message : 'Could not load specialties.');
      } finally {
        if (!cancelled) setSpecialtiesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function clear() {
    setType('');
    setName('');
    setContactNo('');
    setMedicalRegistrationNo('');
    setQualification('');
    setSpecialty('');
    setCertificate(null);
    setFromDate(today);
    setToDate(today);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!name.trim() || !contactNo.trim() || !qualification.trim() || !type || !specialty) {
      toast.error('Please fill all required fields.');
      return;
    }
    if (!/^[0-9]{10}$/.test(contactNo.trim())) {
      toast.error('Contact number must be exactly 10 digits.');
      return;
    }
    if (new Date(toDate) < new Date(fromDate)) {
      toast.error('To Date cannot be before From Date.');
      return;
    }

    setSaving(true);
    try {
      const empanelmentMastId = resolveEmpanelmentMastId();
      const data = {
        details: [
          {
            empanelmentMastId,
            doctorMastId: 0,
            doctorTypeId: Number(type),
            doctorName: name.trim(),
            qualification: qualification.trim(),
            medicalRegistrationNo: medicalRegistrationNo.trim(),
            contactNo: contactNo.trim(),
            speciality: Number(specialty),
            fromDate,
            toDate,
          },
        ],
      };

      await saveDoctor(data);

      if (certificate) {
        try {
          await uploadDocuments({
            empanelmentMastId,
            documentType: DOCTOR_CERTIFICATE_DOCUMENT_TYPE,
            isMandatory: false,
            file: certificate,
          });
        } catch {
          // Certificate upload failing shouldn't block the doctor save that
          // already succeeded — surface a softer warning instead.
          toast.error('Doctor saved, but the certificate upload failed. You can retry it later.');
        }
      }

      toast.success('Doctor saved successfully.');
      onSaved();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Something went wrong.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const doctorTypeOptions = doctorTypes.map((o) => ({ value: o.value, label: o.label }));
  const specialtyOptions = specialties.map((o) => ({ value: o.value, label: o.label }));

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="space-y-5">
        <section className="space-y-3.5">
          <SectionHeading tone="primary" icon={<IconStethoscope size={12} />}>
            Professional details
          </SectionHeading>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Speciality Type"
              required
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={doctorTypeOptions}
              placeholder={doctorTypesLoading ? 'Loading...' : 'Select'}
              error={doctorTypesError ?? undefined}
            />
            <Select
              label="Specialty"
              required
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              options={specialtyOptions}
              placeholder={specialtiesLoading ? 'Loading...' : 'Select'}
              error={specialtiesError ?? undefined}
            />
          </div>

          <Input
            label="Qualification"
            required
            icon={<IconStethoscope size={16} />}
            value={qualification}
            onChange={(e) => setQualification(e.target.value)}
            placeholder="MBBS, MD, MS ..."
          />

          <Input
            label="Medical Registration No."
            icon={<IconBadge size={16} />}
            value={medicalRegistrationNo}
            onChange={(e) => setMedicalRegistrationNo(e.target.value)}
            placeholder="Medical Registration No"
          />
        </section>

        <section className="space-y-3.5 border-t border-divider pt-4">
          <SectionHeading tone="accent" icon={<IconUser size={12} />}>
            Contact
          </SectionHeading>

          <Input label="Name" required icon={<IconUser size={16} />} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />

          <Input
            label="Contact No."
            required
            icon={<IconPhone size={16} />}
            value={contactNo}
            onChange={(e) => setContactNo(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit mobile number"
            inputMode="numeric"
            maxLength={10}
          />
        </section>

        <section className="space-y-3.5 border-t border-divider pt-4">
          <SectionHeading tone="gold" icon={<IconCalendar size={12} />}>
            Empanelment period
          </SectionHeading>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="From Date"
              required
              icon={<IconCalendar size={16} />}
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <Input
              label="To Date"
              required
              icon={<IconCalendar size={16} />}
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-text-primary">Doctor Certificate</label>
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setCertificateDragOver(true);
              }}
              onDragLeave={() => setCertificateDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setCertificateDragOver(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) setCertificate(dropped);
              }}
              className={`flex cursor-pointer items-center gap-3 rounded-md border border-dashed px-4 py-3.5 text-left transition-all duration-200 ${
                certificateDragOver
                  ? 'border-accent bg-accent-pale shadow-[0_0_0_3px] shadow-accent/15'
                  : certificate
                    ? 'border-primary/40 bg-primary-pale/40'
                    : 'border-divider bg-surface-variant hover:border-accent/50 hover:bg-accent-pale/30'
              }`}
            >
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setCertificate(e.target.files?.[0] ?? null)}
              />
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors duration-200 ${
                  certificateDragOver ? 'bg-gradient-to-br from-accent-light to-accent text-white shadow-sm shadow-accent/40' : 'bg-primary-pale text-primary'
                }`}
              >
                <IconFileUp size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-text-primary">
                  {certificate ? certificate.name : 'Drag & drop or click to upload'}
                </span>
                <span className="block text-xs text-text-tertiary">{certificate ? 'Click to replace' : 'PDF or image, optional'}</span>
              </span>
            </label>
          </div>
        </section>

      </div>

      <div className="sticky -mx-5 -mb-4 mt-5 flex items-center justify-end gap-2 border-t border-divider bg-gradient-to-r from-surface to-primary-pale/20 px-5 py-3.5">
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" variant="secondary" onClick={clear} disabled={saving}>
          Clear
        </Button>
        <Button type="submit" isLoading={saving}>
          Save Doctor
        </Button>
      </div>
    </form>
  );
}
