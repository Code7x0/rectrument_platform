import assert from "node:assert/strict";
import test from "node:test";

import { filterJobsForAccountManager } from "./jobs-am-visibility";
import type { Job } from "@/features/jobs/types";

const RAGINI = "am_ragini";
const VPURI = "am_vpuri";
const OTHER = "am_other";
const CLIENT_GRW = "client_grw";

function job(
  partial: Pick<
    Job,
    | "id"
    | "accountManagerId"
    | "accountManagerIds"
    | "accountManagerUnassigned"
  > &
    Partial<Pick<Job, "clientId">>,
): Job {
  return {
    id: partial.id,
    clientId: partial.clientId ?? CLIENT_GRW,
    accountManagerId: partial.accountManagerId,
    accountManagerIds: partial.accountManagerIds,
    accountManagerUnassigned: partial.accountManagerUnassigned,
  } as Job;
}

test("co-owner sees job created/tagged by sibling AM on shared client", () => {
  const originals = [
    job({
      id: "job1",
      accountManagerId: RAGINI,
      accountManagerIds: [RAGINI],
      accountManagerUnassigned: false,
    }),
  ];
  const owners = new Map([[CLIENT_GRW, [RAGINI, VPURI]]]);

  const forVpuri = filterJobsForAccountManager(
    originals,
    originals,
    VPURI,
    owners,
  );
  const forRagini = filterJobsForAccountManager(
    originals,
    originals,
    RAGINI,
    owners,
  );

  assert.equal(forVpuri.length, 1);
  assert.equal(forRagini.length, 1);
});

test("explicit unassign hides job even from client co-owners", () => {
  const originals = [
    job({
      id: "job_none",
      accountManagerId: null,
      accountManagerIds: [],
      accountManagerUnassigned: true,
    }),
  ];
  const owners = new Map([[CLIENT_GRW, [RAGINI, VPURI]]]);

  const visible = filterJobsForAccountManager(
    originals,
    originals,
    VPURI,
    owners,
  );
  assert.equal(visible.length, 0);
});

test("non-owner with explicit job does not inherit sibling unmarked jobs", () => {
  const originals = [
    job({
      id: "assigned",
      accountManagerId: OTHER,
      accountManagerIds: [OTHER],
      accountManagerUnassigned: false,
    }),
    job({
      id: "unmarked",
      accountManagerId: null,
      accountManagerIds: [],
      accountManagerUnassigned: false,
    }),
  ];
  const owners = new Map([[CLIENT_GRW, [RAGINI, VPURI]]]);

  const forOther = filterJobsForAccountManager(
    originals,
    originals,
    OTHER,
    owners,
  );
  assert.deepEqual(
    forOther.map((j) => j.id),
    ["assigned"],
  );
});

test("non-owner without ownership cannot see co-owner tagged jobs", () => {
  const originals = [
    job({
      id: "job1",
      accountManagerId: RAGINI,
      accountManagerIds: [RAGINI],
      accountManagerUnassigned: false,
    }),
  ];
  const owners = new Map([[CLIENT_GRW, [RAGINI, VPURI]]]);

  const forOther = filterJobsForAccountManager(
    originals,
    originals,
    OTHER,
    owners,
  );
  assert.equal(forOther.length, 0);
});
