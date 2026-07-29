// Single shared Google Maps libraries array.
// All useJsApiLoader calls MUST reference this constant — the loader throws
// if the same page instantiates it with different library lists.
export const GOOGLE_MAPS_LIBRARIES: ["places", "marker", "geocoding"] = [
  "places",
  "marker",
  "geocoding",
];
