import assert from "node:assert/strict";
import test from "node:test";

import { isScrolledToEnd } from "@/features/users/lib/agreement-scroll";

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
