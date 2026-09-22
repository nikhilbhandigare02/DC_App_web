/**
 * Ported from `lib/models/pincode_lookup_model.dart`.
 *
 * A single `{Id, Name, Paramid}` row — the shape shared by
 * `GetCityByPincode`, `GetDistrictName` and `GetStateName`. `paramId` is the
 * row's parent id in the State -> District -> City hierarchy (e.g. a city's
 * `paramId` is its district id); `undefined` for a top-level row (a State).
 *
 * Real `GetCityByPincode` response for reference:
 * `{"Success":true,"Data":[{"Id":521,"Name":"Kolhapur","Paramid":390}]}`
 */
export interface MasterLookupItem {
  id: number;
  name: string;
  paramId?: number;
}
