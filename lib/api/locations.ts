import { apiRequest } from './client';

export type ManagedLocation = {
  id: string;
  name: string;
  enabled: boolean;
  latitude?: number;
  longitude?: number;
  zones?: ManagedLocation[];
  areas?: ManagedLocation[];
};

type LocationResponse = { success: boolean; data: { cities: ManagedLocation[] } };

export async function getLocationCatalog(): Promise<LocationResponse> {
  return apiRequest<LocationResponse>('/api/v1/locations');
}

async function mutateLocation(endpoint: string, method: 'POST' | 'PATCH' | 'DELETE', body?: object) {
  return apiRequest<LocationResponse>(endpoint, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

export const createLocationCity = (name: string) =>
  mutateLocation('/api/v1/locations/cities', 'POST', { name });

export const updateLocationCity = (cityId: string, updates: { name?: string; enabled?: boolean }) =>
  mutateLocation(`/api/v1/locations/cities/${encodeURIComponent(cityId)}`, 'PATCH', updates);

export const deleteLocationCity = (cityId: string) =>
  mutateLocation(`/api/v1/locations/cities/${encodeURIComponent(cityId)}`, 'DELETE');

export const createLocationZone = (cityId: string, name: string) =>
  mutateLocation(`/api/v1/locations/cities/${encodeURIComponent(cityId)}/zones`, 'POST', { name });

export const updateLocationZone = (
  cityId: string,
  zoneId: string,
  updates: { name?: string; enabled?: boolean },
) =>
  mutateLocation(`/api/v1/locations/cities/${encodeURIComponent(cityId)}/zones/${encodeURIComponent(zoneId)}`, 'PATCH', updates);

export const deleteLocationZone = (cityId: string, zoneId: string) =>
  mutateLocation(`/api/v1/locations/cities/${encodeURIComponent(cityId)}/zones/${encodeURIComponent(zoneId)}`, 'DELETE');

export const createCityLocationArea = (cityId: string, name: string) =>
  mutateLocation(`/api/v1/locations/cities/${encodeURIComponent(cityId)}/areas`, 'POST', { name });

export const updateCityLocationArea = (
  cityId: string,
  areaId: string,
  updates: { name?: string; enabled?: boolean },
) =>
  mutateLocation(
    `/api/v1/locations/cities/${encodeURIComponent(cityId)}/areas/${encodeURIComponent(areaId)}`,
    'PATCH',
    updates,
  );

export const deleteCityLocationArea = (cityId: string, areaId: string) =>
  mutateLocation(`/api/v1/locations/cities/${encodeURIComponent(cityId)}/areas/${encodeURIComponent(areaId)}`, 'DELETE');

export const createLocationArea = (cityId: string, zoneId: string, name: string) =>
  mutateLocation(
    `/api/v1/locations/cities/${encodeURIComponent(cityId)}/zones/${encodeURIComponent(zoneId)}/areas`,
    'POST',
    { name },
  );

export const updateLocationArea = (
  cityId: string,
  zoneId: string,
  areaId: string,
  updates: { name?: string; enabled?: boolean },
) =>
  mutateLocation(
    `/api/v1/locations/cities/${encodeURIComponent(cityId)}/zones/${encodeURIComponent(zoneId)}/areas/${encodeURIComponent(areaId)}`,
    'PATCH',
    updates,
  );

export const deleteLocationArea = (cityId: string, zoneId: string, areaId: string) =>
  mutateLocation(
    `/api/v1/locations/cities/${encodeURIComponent(cityId)}/zones/${encodeURIComponent(zoneId)}/areas/${encodeURIComponent(areaId)}`,
    'DELETE',
  );