// Dynamic Expo config — extends app.json with environment-injected secrets.
// GOOGLE_API_KEY must be set in the Replit environment (and as an EAS secret
// for CI builds). All other static config lives in app.json.
const appJson = require("./app.json");
const base = appJson.expo;

module.exports = {
  ...base,
  android: {
    ...base.android,
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_API_KEY ?? "",
      },
    },
  },
  ios: {
    ...base.ios,
    config: {
      googleMapsApiKey: process.env.GOOGLE_API_KEY ?? "",
    },
  },
};
