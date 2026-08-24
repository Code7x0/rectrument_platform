import assert from "node:assert/strict";
import test from "node:test";

import {
  hasReachedLastPage,
  isScrolledToEnd,
} from "@/features/users/lib/agreement-scroll";

test("isScrolledToEnd is false until the last page/end of the document", () => {
  assert.equal(
    isScrolledToEnd({ scrollHeight: 1400, scrollTop: 0, clientHeight: 400 }),
    false,
  );
  assert.equal(
    isScrolledToEnd({ scrollHeight: 1400, scrollTop: 952, clientHeight: 400 }),
    true,
  );
});

test("hasReachedLastPage unlocks when the last page bottom reaches the fold", () => {
  const root = {
    scrollHeight: 4000,
    scrollTop: 200,
    clientHeight: 700,
    getBoundingClientRect: () => ({ top: 80, bottom: 780 }),
  };
  assert.equal(
    hasReachedLastPage(root, {
      getBoundingClientRect: () => ({ top: 500, bottom: 2200 }),
    }),
    false,
  );
  assert.equal(
    hasReachedLastPage(root, {
      getBoundingClientRect: () => ({ top: 200, bottom: 820 }),
    }),
    true,
  );
});
