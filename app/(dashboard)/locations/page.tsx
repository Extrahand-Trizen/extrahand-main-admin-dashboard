'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  CircleOff,
  Layers,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  createCityLocationArea,
  createLocationArea,
  createLocationCity,
  createLocationZone,
  deleteCityLocationArea,
  deleteLocationArea,
  deleteLocationCity,
  deleteLocationZone,
  getLocationCatalog,
  ManagedLocation,
  updateCityLocationArea,
  updateLocationArea,
  updateLocationCity,
  updateLocationZone,
} from '@/lib/api/locations';
import { usePermissions } from '@/lib/hooks/usePermissions';

type LocationLevel = 'city' | 'zone' | 'area';
type EditorState = { level: LocationLevel; location?: ManagedLocation } | null;

const levelLabels: Record<LocationLevel, string> = { city: 'City', zone: 'Zone', area: 'Area' };

function Status({ enabled }: { enabled: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-gray-400'}`} />
      {enabled ? 'Active' : 'Disabled'}
    </span>
  );
}

function LocationEditor({
  editor,
  saving,
  onClose,
  onSave,
}: {
  editor: Exclude<EditorState, null>;
  saving: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(editor.location?.name || '');

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/40 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-editor-title"
        className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(name.trim());
        }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="location-editor-title" className="text-lg font-semibold text-gray-900">
            {editor.location ? `Edit ${levelLabels[editor.level]}` : `Add ${levelLabels[editor.level]}`}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <label htmlFor="location-name" className="mb-1.5 block text-sm font-medium text-gray-700">Name</label>
        <input
          id="location-name"
          autoFocus
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
          placeholder={`${levelLabels[editor.level]} name`}
        />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={!name.trim() || saving} className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

function RowActions({
  location,
  canEdit,
  onEdit,
  onToggle,
  onDelete,
}: {
  location: ManagedLocation;
  canEdit: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  if (!canEdit) return null;
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button type="button" onClick={onEdit} title={`Edit ${location.name}`} aria-label={`Edit ${location.name}`} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"><Pencil className="h-4 w-4" /></button>
      <button type="button" onClick={onToggle} title={location.enabled ? 'Disable' : 'Enable'} aria-label={`${location.enabled ? 'Disable' : 'Enable'} ${location.name}`} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900">{location.enabled ? <CircleOff className="h-4 w-4" /> : <Check className="h-4 w-4" />}</button>
      <button type="button" onClick={onDelete} title={`Remove ${location.name}`} aria-label={`Remove ${location.name}`} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}

export default function LocationManagementPage() {
  const { hasPermission } = usePermissions();
  const canManageLocations = hasPermission('user.update');
  const [cities, setCities] = useState<ManagedLocation[]>([]);
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<EditorState>(null);

  const loadCatalog = useCallback(async () => {
    try {
      const response = await getLocationCatalog();
      const nextCities = response?.data?.cities || [];
      setCities(nextCities);
      setSelectedCityId((current) => nextCities.some((city) => city.id === current) ? current : '');
      const selectedCity = nextCities.find((city) => city.id === selectedCityId);
      setSelectedZoneId((current) =>
        !selectedCity?.areas?.length && selectedCity?.zones?.some((zone) => zone.id === current)
          ? current
          : '',
      );
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load locations');
    } finally {
      setLoading(false);
    }
  }, [selectedCityId]);

  useEffect(() => { void loadCatalog(); }, [loadCatalog]);

  const city = cities.find((entry) => entry.id === selectedCityId) || null;
  const zone = city?.zones?.find((entry) => entry.id === selectedZoneId) || null;
  const showingCityAreas = Boolean(city?.areas?.length);
  const zoneCount = cities.reduce(
    (count, entry) => count + (entry.areas?.length ? 0 : entry.zones?.length || 0),
    0,
  );
  const areaCount = cities.reduce((count, entry) =>
    count + (entry.areas?.length || 0) +
      (entry.areas?.length ? 0 : (entry.zones || []).reduce(
        (zoneTotal, entryZone) => zoneTotal + (entryZone.areas?.length || 0),
        0,
      )), 0);

  const perform = async (action: () => Promise<unknown>) => {
    setSaving(true);
    setError('');
    try {
      await action();
      setEditor(null);
      await loadCatalog();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'Could not update locations');
    } finally {
      setSaving(false);
    }
  };

  const saveEditor = (name: string) => {
    if (!editor) return;
    const { level, location } = editor;
    if (level === 'city') {
      void perform(() => location ? updateLocationCity(location.id, { name }) : createLocationCity(name));
    } else if (level === 'zone' && city) {
      void perform(() => location ? updateLocationZone(city.id, location.id, { name }) : createLocationZone(city.id, name));
    } else if (level === 'area' && city) {
      if (zone) {
        void perform(() => location
          ? updateLocationArea(city.id, zone.id, location.id, { name })
          : createLocationArea(city.id, zone.id, name));
      } else {
        void perform(() => location
          ? updateCityLocationArea(city.id, location.id, { name })
          : createCityLocationArea(city.id, name));
      }
    }
  };

  const toggle = (level: LocationLevel, location: ManagedLocation) => {
    if (level === 'city') void perform(() => updateLocationCity(location.id, { enabled: !location.enabled }));
    else if (level === 'zone' && city) void perform(() => updateLocationZone(city.id, location.id, { enabled: !location.enabled }));
    else if (level === 'area' && city) {
      if (zone) void perform(() => updateLocationArea(city.id, zone.id, location.id, { enabled: !location.enabled }));
      else void perform(() => updateCityLocationArea(city.id, location.id, { enabled: !location.enabled }));
    }
  };

  const remove = (level: LocationLevel, location: ManagedLocation) => {
    const includesChildren = level !== 'area';
    const message = includesChildren
      ? `Remove ${location.name} and all of its child locations from new partner registration? Existing partner service areas will remain unchanged.`
      : `Remove ${location.name} from new partner registration? Existing partner service areas will remain unchanged.`;
    if (!window.confirm(message)) return;
    if (level === 'city') void perform(() => deleteLocationCity(location.id));
    else if (level === 'zone' && city) void perform(() => deleteLocationZone(city.id, location.id));
    else if (level === 'area' && city) {
      if (zone) void perform(() => deleteLocationArea(city.id, zone.id, location.id));
      else void perform(() => deleteCityLocationArea(city.id, location.id));
    }
  };

  const openEditor = (level: LocationLevel, location?: ManagedLocation) => setEditor({ level, location });

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700"><MapPin className="h-4 w-4" /> Operations configuration</div>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900">Location Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage the locations available during partner registration.</p>
        </div>
        {canManageLocations && <button type="button" onClick={() => openEditor('city')} className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"><Plus className="h-4 w-4" /> Add city</button>}
      </div>

      <div className="grid grid-cols-3 divide-x divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {[['Cities', cities.length], ['Zones', zoneCount], ['Areas', areaCount]].map(([label, count]) => (
          <div key={label} className="px-4 py-3 sm:px-5"><p className="text-xs font-medium uppercase text-gray-500">{label}</p><p className="mt-1 text-xl font-semibold text-gray-900">{count}</p></div>
        ))}
      </div>

      {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className={`grid min-h-[440px] grid-cols-1 overflow-hidden rounded-lg border border-gray-200 bg-white ${showingCityAreas ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        <section className="border-b border-gray-200 md:border-b-0 md:border-r" aria-label="Cities">
          <div className="flex h-14 items-center justify-between border-b border-gray-100 px-4">
            <div><h2 className="text-sm font-semibold text-gray-900">Cities</h2><p className="text-xs text-gray-500">Top level</p></div>
            {canManageLocations && <button type="button" onClick={() => openEditor('city')} title="Add city" aria-label="Add city" className="rounded-md p-1.5 text-gray-500 hover:bg-amber-50 hover:text-amber-700"><Plus className="h-4 w-4" /></button>}
          </div>
          <div className="max-h-[520px] overflow-y-auto p-2">
            {loading ? <p className="px-3 py-5 text-sm text-gray-500">Loading cities…</p> : cities.map((entry) => (
              <div key={entry.id} onClick={() => { setSelectedCityId(entry.id); setSelectedZoneId(''); }} className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 ${entry.id === city?.id ? 'bg-amber-50 ring-1 ring-amber-200' : 'hover:bg-gray-50'}`}>
                <div className="min-w-0"><p className="truncate text-sm font-medium text-gray-800">{entry.name}</p><Status enabled={entry.enabled !== false} /></div>
                <RowActions location={{ ...entry, enabled: entry.enabled !== false }} canEdit={canManageLocations} onEdit={() => openEditor('city', entry)} onToggle={() => toggle('city', entry)} onDelete={() => remove('city', entry)} />
              </div>
            ))}
            {!loading && cities.length === 0 && <p className="px-3 py-5 text-sm text-gray-500">No cities yet.</p>}
          </div>
        </section>

        <section className="border-b border-gray-200 md:border-b-0 md:border-r" aria-label={showingCityAreas ? 'Areas' : 'Zones'}>
          <div className="flex h-14 items-center justify-between border-b border-gray-100 px-4">
            <div><h2 className="text-sm font-semibold text-gray-900">{showingCityAreas ? 'Areas' : 'Zones'}</h2><p className="truncate text-xs text-gray-500">{showingCityAreas ? `${city?.name} · Areas in this city` : city?.name || 'Choose a city'}</p></div>
            {canManageLocations && <button type="button" disabled={!city} onClick={() => openEditor(showingCityAreas ? 'area' : 'zone')} title={showingCityAreas ? 'Add area' : 'Add zone'} aria-label={showingCityAreas ? 'Add area' : 'Add zone'} className="rounded-md p-1.5 text-gray-500 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-40"><Plus className="h-4 w-4" /></button>}
          </div>
          <div className="max-h-[520px] overflow-y-auto p-2">
            {showingCityAreas ? city?.areas?.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-2 rounded-md px-2.5 py-2 hover:bg-gray-50">
                <div className="min-w-0"><p className="truncate text-sm font-medium text-gray-800">{entry.name}</p><Status enabled={entry.enabled !== false} /></div>
                <RowActions location={{ ...entry, enabled: entry.enabled !== false }} canEdit={canManageLocations} onEdit={() => openEditor('area', entry)} onToggle={() => toggle('area', entry)} onDelete={() => remove('area', entry)} />
              </div>
            )) : city?.zones?.map((entry) => (
              <div key={entry.id} onClick={() => setSelectedZoneId(entry.id)} className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 ${entry.id === zone?.id ? 'bg-amber-50 ring-1 ring-amber-200' : 'hover:bg-gray-50'}`}>
                <div className="min-w-0"><p className="truncate text-sm font-medium text-gray-800">{entry.name}</p><Status enabled={entry.enabled !== false} /></div>
                <RowActions location={{ ...entry, enabled: entry.enabled !== false }} canEdit={canManageLocations} onEdit={() => openEditor('zone', entry)} onToggle={() => toggle('zone', entry)} onDelete={() => remove('zone', entry)} />
              </div>
            ))}
            {city && showingCityAreas && !city.areas?.length && <p className="px-3 py-5 text-sm text-gray-500">No areas in this city.</p>}
            {city && !showingCityAreas && !city.zones?.length && <p className="px-3 py-5 text-sm text-gray-500">No zones in this city.</p>}
            {!loading && !city && <div className="flex flex-col items-center px-4 py-12 text-center text-gray-400"><Layers className="mb-2 h-6 w-6" /><p className="text-sm font-medium text-gray-600">Select a city</p><p className="mt-1 text-xs">Please select a city from the left to view and manage its zones.</p></div>}
          </div>
        </section>

        {!showingCityAreas && <section aria-label="Areas">
          <div className="flex h-14 items-center justify-between border-b border-gray-100 px-4">
            <div><h2 className="text-sm font-semibold text-gray-900">Areas</h2><p className="truncate text-xs text-gray-500">{zone?.name || (city ? `${city.name} · Areas in this city` : 'Choose a city')}</p></div>
            {canManageLocations && <button type="button" disabled={!city} onClick={() => openEditor('area')} title="Add area" aria-label="Add area" className="rounded-md p-1.5 text-gray-500 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-40"><Plus className="h-4 w-4" /></button>}
          </div>
          <div className="max-h-[520px] overflow-y-auto p-2">
            {(zone?.areas ?? city?.areas)?.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-2 rounded-md px-2.5 py-2 hover:bg-gray-50">
                <div className="min-w-0"><p className="truncate text-sm font-medium text-gray-800">{entry.name}</p><Status enabled={entry.enabled !== false} /></div>
                <RowActions location={{ ...entry, enabled: entry.enabled !== false }} canEdit={canManageLocations} onEdit={() => openEditor('area', entry)} onToggle={() => toggle('area', entry)} onDelete={() => remove('area', entry)} />
              </div>
            ))}
            {(zone || city) && !(zone?.areas ?? city?.areas)?.length && <p className="px-3 py-5 text-sm text-gray-500">No areas {zone ? 'in this zone' : 'in this city'}.</p>}
            {!city && !loading && <div className="flex flex-col items-center px-4 py-12 text-center text-gray-400"><MapPin className="mb-2 h-6 w-6" /><p className="text-sm font-medium text-gray-600">Select a city</p><p className="mt-1 text-xs">Please select a city to view and manage its areas, with or without a zone.</p></div>}
          </div>
        </section>}
      </div>

      {editor && <LocationEditor editor={editor} saving={saving} onClose={() => setEditor(null)} onSave={saveEditor} />}
    </div>
  );
}