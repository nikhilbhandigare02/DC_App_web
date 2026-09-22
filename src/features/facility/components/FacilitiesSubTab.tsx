/**
 * "Facilities" sub-tab — ported from the facility-type accordion list in
 * `lib/screens/facility/widgets/facility_sections.dart` (`FacilityTypesAdded`,
 * `FacilityEntryRemoved`, `FacilityEntryExpandToggled` and friends in
 * `facility_event.dart`).
 *
 * Redesigned as a `Table` summarizing each facility-type entry (type, source,
 * visit type, hours, status) with a row action that opens the full entry
 * form in a side `Drawer`, instead of an accordion-of-cards list.
 */

import { useEffect, useState } from 'react';
import { getFacilitiesMaster, getSourceType, getVisitType } from '../../../api/ddlApi';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Drawer } from '../../../components/ui/Drawer';
import { Table, type TableColumn } from '../../../components/ui/Table';
import { IconApartment, IconBolt, IconBuilding } from '../../../components/icons';
import { toast } from '../../../lib/toast';
import type { DdlOptionModel } from '../../../types/ddl';
import type { FacilityEntryData, FacilityMasterCategory, FacilityMasterItem } from '../../../types/facility';
import { nextLocalId, timeToInputValue } from '../utils';
import { FacilityEntryCard } from './FacilityEntryCard';
import { FacilityTypePicker } from './FacilityTypePicker';
import { IconPlus } from './icons';

const ROW_ICON_TONES = [
  { icon: IconBuilding, className: 'bg-primary-pale text-primary' },
  { icon: IconApartment, className: 'bg-accent-pale text-accent-dark' },
  { icon: IconBolt, className: 'bg-gold-pale text-gold' },
];

function rowTone(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i)) % ROW_ICON_TONES.length;
  return ROW_ICON_TONES[hash];
}

const DEFAULT_TIME_FROM = { hour: 9, minute: 0 };
const DEFAULT_TIME_TO = { hour: 18, minute: 0 };

function newEntry(item: FacilityMasterItem): FacilityEntryData {
  return {
    id: nextLocalId('facility'),
    typeCode: String(item.id),
    typeLabel: item.name,
    sourceType: null,
    visitType: null,
    sourceName: '',
    sourceAddress: '',
    timeFrom: { ...DEFAULT_TIME_FROM },
    timeTo: { ...DEFAULT_TIME_TO },
    contactPerson: '',
    contactNumber: '',
    distanceKm: '',
    fullAddress: '',
    pincode: '',
    latitude: '',
    longitude: '',
    stateId: null,
    stateName: null,
    districtId: null,
    districtName: null,
    cityId: null,
    cityName: null,
    dcPhotoFile: null,
    dcVideoFile: null,
  };
}

function isOutsourceLabel(value?: string | null): boolean {
  return !!value && value.toLowerCase().includes('outsource');
}

function outsourceComplete(facility: FacilityEntryData): boolean {
  return (
    !!facility.contactPerson.trim() &&
    !!facility.fullAddress.trim() &&
    facility.pincode.trim().length === 6 &&
    !!facility.stateId &&
    !!facility.districtId &&
    !!facility.cityId &&
    !!facility.dcPhotoFile
  );
}

export function FacilitiesSubTab() {
  const [facilities, setFacilities] = useState<FacilityEntryData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const [masterCategories, setMasterCategories] = useState<FacilityMasterCategory[]>([]);
  const [masterLoading, setMasterLoading] = useState(true);

  const [sourceTypeOptions, setSourceTypeOptions] = useState<DdlOptionModel[]>([
    { label: 'Inhouse', value: 'Inhouse' },
    { label: 'Outsource', value: 'Outsource' },
  ]);
  const [visitTypeOptions, setVisitTypeOptions] = useState<DdlOptionModel[]>([
    { label: 'Centre', value: 'Centre' },
    { label: 'Home', value: 'Home' },
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const categories = await getFacilitiesMaster();
        if (!cancelled) setMasterCategories(categories);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Facility types are not available right now.';
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setMasterLoading(false);
      }
    })();
    getSourceType()
      .then((options) => !cancelled && setSourceTypeOptions(options))
      .catch(() => undefined);
    getVisitType()
      .then((options) => !cancelled && setVisitTypeOptions(options))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function addFacilityTypes(items: FacilityMasterItem[]) {
    const entries = items.map(newEntry);
    setFacilities((prev) => [...prev, ...entries]);
    setShowPicker(false);
    if (entries.length > 0) setEditingId(entries[0].id);
  }

  function removeFacility(id: string) {
    setFacilities((prev) => prev.filter((f) => f.id !== id));
    setEditingId((current) => (current === id ? null : current));
  }

  function updateFacility(id: string, patch: Partial<FacilityEntryData>) {
    setFacilities((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  const alreadyAddedTypeCodes = new Set(facilities.map((f) => f.typeCode));
  const editingFacility = facilities.find((f) => f.id === editingId) ?? null;

  const columns: TableColumn<FacilityEntryData>[] = [
    {
      key: 'typeLabel',
      header: 'Facility Type',
      sortable: true,
      render: (row) => {
        const tone = rowTone(row.typeLabel);
        const RowIcon = tone.icon;
        return (
          <div className="flex items-center gap-2.5">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${tone.className}`}>
              <RowIcon size={13} />
            </span>
            <span className="font-medium text-text-primary">{row.typeLabel}</span>
          </div>
        );
      },
    },
    {
      key: 'sourceType',
      header: 'Source Type',
      render: (row) => row.sourceType || <span className="text-text-tertiary">Not set</span>,
    },
    {
      key: 'visitType',
      header: 'Visit Type',
      render: (row) => row.visitType || <span className="text-text-tertiary">Not set</span>,
    },
    {
      key: 'hours',
      header: 'Hours',
      render: (row) => (
        <span className="whitespace-nowrap">
          {timeToInputValue(row.timeFrom)} <span className="text-text-tertiary">–</span> {timeToInputValue(row.timeTo)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        if (!isOutsourceLabel(row.sourceType)) {
          return <Badge tone="neutral">{row.sourceType ? 'Inhouse' : 'Not configured'}</Badge>;
        }
        return outsourceComplete(row) ? (
          <Badge tone="success">Details complete</Badge>
        ) : (
          <Badge tone="warning">Incomplete</Badge>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '150px',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => setEditingId(row.id)}>
            Edit
          </Button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeFacility(row.id);
            }}
            className="rounded-md bg-error-pale px-2 py-1 text-xs font-semibold text-error hover:bg-error/10"
          >
            Remove
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-tertiary">Facility types offered by this diagnostic centre.</p>
        <Button
          size="sm"
          variant="secondary"
          icon={<IconPlus size={13} className="text-accent" />}
          onClick={() => setShowPicker(true)}
          disabled={masterLoading}
          className="border-accent/30 hover:bg-accent-pale/50 hover:shadow-sm hover:shadow-accent/15"
        >
          Add more
        </Button>
      </div>

      <Table
        columns={columns}
        data={facilities}
        rowKey={(row) => row.id}
        onRowClick={(row) => setEditingId(row.id)}
        isLoading={masterLoading && facilities.length === 0}
        emptyState={'No facilities added yet. Use "+ Add more" to get started.'}
      />

      {showPicker && (
        <FacilityTypePicker
          categories={masterCategories}
          alreadyAddedTypeCodes={alreadyAddedTypeCodes}
          onClose={() => setShowPicker(false)}
          onAdd={addFacilityTypes}
        />
      )}

      <Drawer
        open={editingFacility != null}
        onClose={() => setEditingId(null)}
        title={editingFacility?.typeLabel ?? 'Facility details'}
        width={480}
      >
        {editingFacility && (
          <FacilityEntryCard
            facility={editingFacility}
            sourceTypeOptions={sourceTypeOptions}
            visitTypeOptions={visitTypeOptions}
            onRemove={() => removeFacility(editingFacility.id)}
            onChange={(patch) => updateFacility(editingFacility.id, patch)}
            onClose={() => setEditingId(null)}
          />
        )}
      </Drawer>
    </div>
  );
}
