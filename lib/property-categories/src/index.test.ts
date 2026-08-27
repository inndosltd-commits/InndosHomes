import assert from "node:assert/strict";
import {
  normalizePropertyCategory,
  normalizePropertySubtype,
  propertyCategoryLabel,
} from "./index";

assert.deepEqual(normalizePropertyCategory("rent-business"), { type: "rent", subtype: "business" });
assert.deepEqual(normalizePropertyCategory("sale", "sale_land"), { type: "sale", subtype: "land" });
assert.equal(normalizePropertySubtype("Student Housing"), "student-housing");
assert.equal(propertyCategoryLabel("rent", "godown"), "For Rent · Godown");
assert.equal(propertyCategoryLabel("sale", "land"), "For Sale · Land");
console.log("property category contract checks passed");