import { expect, test } from "bun:test";
import {
  autoSelectContractorId,
  writableContractorIds,
} from "../apps/web/src/features/site-activity/utils/activity-contractor.js";

const projectIds = ["aaa", "bbb"];

test("admins may submit for every Project Contractor", () => {
  expect(writableContractorIds({ isAdmin: true, membershipIds: [], projectIds })).toEqual(["aaa", "bbb"]);
});

test("members may submit only for their own Project Contractors", () => {
  expect(writableContractorIds({ isAdmin: false, membershipIds: ["bbb", "zzz"], projectIds })).toEqual(["bbb"]);
  expect(writableContractorIds({ isAdmin: false, membershipIds: [], projectIds })).toEqual([]);
});

test("auto-select needs exactly one membership match on new Activities", () => {
  const base = { isNew: true, current: "", projectIds };
  expect(autoSelectContractorId({ ...base, membershipIds: ["bbb"] })).toBe("bbb");
  expect(autoSelectContractorId({ ...base, membershipIds: [] })).toBeNull();
  expect(autoSelectContractorId({ ...base, membershipIds: ["aaa", "bbb"] })).toBeNull();
  // A lone Project Contractor without membership is never enough.
  expect(autoSelectContractorId({ ...base, membershipIds: [], projectIds: ["aaa"] })).toBeNull();
});

test("auto-select never overwrites explicit choices or edits", () => {
  expect(autoSelectContractorId({ isNew: true, current: "aaa", membershipIds: ["aaa"], projectIds })).toBeNull();
  expect(autoSelectContractorId({ isNew: false, current: "", membershipIds: ["bbb"], projectIds })).toBeNull();
});
