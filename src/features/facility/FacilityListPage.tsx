/**
 * "Facilities" list screen, opened from the Facility Configuration header's
 * "View facility" button — the browser version of the mobile app's
 * `FacilityListScreen` / `FacilityConfigListCard`. Cards show basic info;
 * clicking one opens a modal with everything (day-wise timing included) and
 * Edit / Remove icons in its corner.
 *
 * Edit starts the update flow on the Facility Configuration screen: DC Timing
 * -> Additional -> Facilities, pre-filled from the facility. Remove only
 * changes this session's list. Loaded from the server (see
 * `facilityConfigStore.ts`).
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { IconClose, IconClock } from '../../components/icons';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { PaginationBar } from '../../components/ui/PaginationBar';
import { Panel } from '../../components/ui/Panel';
import { usePagination } from '../../utils/usePagination';
import { deleteFacilityDetails } from '../../api/facilityApi';
import { toast } from '../../lib/toast';
import { resolveEmpanelmentMastId } from './utils';
import { IconPencil, IconTrash } from './components/icons';
import {
  ALL_DAYS,
  loadFacilityConfigs,
  timingFor,
  useFacilityConfigs,
  useFacilityConfigsStatus,
  type FacilityConfigItem,
} from './facilityConfigStore';

const SOURCE_FILTERS = ['All', 'Inhouse', 'Outsource'] as const;

function sourceTone(source: FacilityConfigItem['sourceType']): BadgeTone {
  return source === 'Outsource' ? 'warning' : 'success';
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

/** "View photo" / "View video" for a facility whose DC photo / video is saved (opens it in a new tab). */
function DocLinks({ item }: { item: FacilityConfigItem }) {
  if (!item.photoUrl && !item.videoUrl) return null;
  const link = 'text-xs font-semibold text-primary hover:underline';
  return (
    <span className="flex items-center gap-3">
      {item.photoUrl && (
        <a href={item.photoUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className={link}>
          View photo
        </a>
      )}
      {item.videoUrl && (
        <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className={link}>
          View video
        </a>
      )}
    </span>
  );
}

function FlagPill({ label, on }: { label: string; on: boolean }) {
  return <Badge tone={on ? 'success' : 'neutral'}>{`${label}: ${on ? 'Yes' : 'No'}`}</Badge>;
}

/** Full details of one facility, with Edit / Remove icons in the modal's header corner. */
function FacilityDetailModal({
  item,
  onClose,
  onEdit,
  onRemove,
}: {
  item: FacilityConfigItem;
  onClose: () => void;
  /** Starts the update flow for this facility. */
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      width={520}
      title={item.name}
      headerActions={
        <>
          <button
            type="button"
            aria-label="Edit"
            title="Edit"
            onClick={onEdit}
            className="flex h-7 w-7 items-center justify-center rounded-md text-primary hover:bg-primary-pale"
          >
            <IconPencil size={15} />
          </button>
          <button
            type="button"
            aria-label="Remove"
            title="Remove"
            onClick={onRemove}
            className="flex h-7 w-7 items-center justify-center rounded-md text-error hover:bg-error-pale"
          >
            <IconTrash size={15} />
          </button>
        </>
      }
    >
      <div className="flex flex-wrap gap-2">
        <Badge tone={sourceTone(item.sourceType)}>{item.sourceType}</Badge>
        <Badge tone="info">{item.category}</Badge>
      </div>

      <dl className="mt-4 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2.5 text-[13px]">
        <dt className="text-text-tertiary">Visit Type</dt>
        <dd className="font-medium text-text-primary">{item.visitType}</dd>
        {item.location && (
          <>
            <dt className="text-text-tertiary">Location</dt>
            <dd className="font-medium text-text-primary">{item.location}</dd>
          </>
        )}
        {item.contactNo && (
          <>
            <dt className="text-text-tertiary">Contact No.</dt>
            <dd className="font-medium text-text-primary">{item.contactNo}</dd>
          </>
        )}
      </dl>

      <p className="mb-2 mt-5 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">Day-wise timing</p>
      <div className="flex flex-col gap-1.5">
        {ALL_DAYS.map((day) => {
          const time = timingFor(item, day);
          return (
            <div
              key={day}
              className={`flex items-center gap-3 rounded-md border px-3 py-2 text-[13px] ${
                time ? 'border-primary/20 bg-primary-pale' : 'border-divider bg-surface-variant'
              }`}
            >
              <span className={`w-11 font-semibold ${time ? 'text-primary' : 'text-text-tertiary'}`}>{day}</span>
              <span className={time ? 'text-text-primary' : 'text-text-tertiary'}>{time ?? 'Closed'}</span>
            </div>
          );
        })}
      </div>

      {(item.photoUrl || item.videoUrl) && (
        <>
          <p className="mb-2 mt-5 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">Documents</p>
          <DocLinks item={item} />
        </>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <FlagPill label="Home Visit" on={item.homeVisit} />
        <FlagPill label="Parking" on={item.parking} />
        <FlagPill label="Multispeciality" on={item.multispeciality} />
      </div>
    </Modal>
  );
}

export function FacilityListPage() {
  const navigate = useNavigate();
  const items = useFacilityConfigs();
  const { loading, error } = useFacilityConfigsStatus();

  // Reload from the server every time the list opens, so it shows what is stored.
  useEffect(() => {
    void loadFacilityConfigs();
  }, []);
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<(typeof SOURCE_FILTERS)[number]>('All');
  const [openId, setOpenId] = useState<number | null>(null);
  const [removing, setRemoving] = useState<FacilityConfigItem | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const query = search.trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (sourceFilter !== 'All' && item.sourceType !== sourceFilter) return false;
    if (!query) return true;
    return [item.name, item.category, item.visitType, item.location ?? '', item.contactNo ?? ''].some((v) =>
      v.toLowerCase().includes(query),
    );
  });
  const { currentPage, totalPages, pageItems, setPage, totalItems } = usePagination(filtered);
  const filtering = query !== '' || sourceFilter !== 'All';
  const openItem = items.find((i) => i.id === openId) ?? null;

  /** Starts the update flow: Facility Configuration, on the first tab (DC Timing), pre-filled from this facility. */
  function startEdit(item: FacilityConfigItem) {
    navigate('/home/facility', { state: { topTab: 1, subTab: 0, editId: item.id } });
  }

  function toggleSearch() {
    setShowSearch((open) => !open);
    setSearch('');
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Facilities"
        description="Configured facilities, timings and details."
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate('/home/facility')}>
            Back
          </Button>
        }
      />

      <Panel>
        <div className="flex items-center justify-between gap-3">
          {showSearch ? (
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search facility, location, contact..."
              className="min-w-0 flex-1 rounded-md border border-divider bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
            />
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-primary">Configured facilities</h2>
              <span className="rounded-full bg-primary-pale px-2 py-0.5 text-[11px] font-bold text-primary">
                {filtering ? `${filtered.length}/${items.length}` : items.length}
              </span>
            </div>
          )}
          <button
            type="button"
            aria-label={showSearch ? 'Close search' : 'Search facilities'}
            title={showSearch ? 'Close search' : 'Search'}
            onClick={toggleSearch}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors ${
              showSearch
                ? 'border-primary/40 bg-primary-pale text-primary'
                : 'border-divider bg-surface text-text-secondary hover:bg-surface-variant'
            }`}
          >
            {showSearch ? <IconClose size={15} /> : <SearchIcon />}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {SOURCE_FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSourceFilter(option)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                sourceFilter === option
                  ? 'border-primary/30 bg-primary-pale text-primary'
                  : 'border-divider bg-surface text-text-secondary hover:bg-surface-variant'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-secondary">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-divider border-t-primary" />
            Loading facilities...
          </div>
        ) : error && items.length === 0 ? (
          <p className="py-10 text-center text-sm text-error">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-tertiary">
            {items.length === 0 ? 'No facilities configured yet.' : 'No configuration matches your search/filter.'}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {pageItems.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                // Click opens the form pre-filled from this facility's saved data (by its id).
                onClick={() => startEdit(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    startEdit(item);
                  }
                }}
                className="cursor-pointer rounded-lg border border-divider bg-surface-variant/40 p-3.5 text-left transition-colors hover:border-primary/30 hover:bg-primary-pale/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[14px] font-semibold text-text-primary">{item.name}</p>
                  <div className="flex items-center gap-1.5">
                    {item.status && <Badge tone={item.statusId === 33 ? 'error' : 'warning'}>{item.status}</Badge>}
                    <Badge tone={sourceTone(item.sourceType)}>{item.sourceType}</Badge>
                  </div>
                </div>
                <p className="mt-1 text-[11.5px] text-text-tertiary">
                  {item.category} · {item.visitType} visit
                </p>
                {(item.sourceName || item.location) && (
                  <p className="mt-1 truncate text-[11.5px] text-text-secondary">
                    {[item.sourceName, item.location].filter(Boolean).join(' · ')}
                  </p>
                )}
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-text-primary">
                    <IconClock size={14} />
                    {item.timing}
                  </p>
                  <div className="flex items-center gap-3">
                    <DocLinks item={item} />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenId(item.id);
                      }}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalItems > 0 && (
          <div className="mt-4 border-t border-divider pt-3">
            <PaginationBar currentPage={currentPage} totalPages={totalPages} onPageSelected={setPage} totalItems={totalItems} />
          </div>
        )}
      </Panel>

      {openItem && !removing && (
        <FacilityDetailModal
          item={openItem}
          onClose={() => setOpenId(null)}
          onEdit={() => startEdit(openItem)}
          onRemove={() => setRemoving(openItem)}
        />
      )}

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        width={400}
        title="Remove facility?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={removeBusy}
              onClick={async () => {
                if (!removing) return;
                setRemoveBusy(true);
                try {
                  // A removal request: the facility is made inactive and recorded with an approval row (status 33).
                  await deleteFacilityDetails({ empanelmentMastId: resolveEmpanelmentMastId(), facilityDetailsId: removing.id });
                  toast.success('Facility removed successfully');
                  setRemoving(null);
                  setOpenId(null);
                  await loadFacilityConfigs();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Could not remove the facility.');
                } finally {
                  setRemoveBusy(false);
                }
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">{removing?.name} will be removed. The removal is recorded for approval.</p>
      </Modal>
    </div>
  );
}
