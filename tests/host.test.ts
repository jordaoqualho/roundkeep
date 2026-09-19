import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowedHost, isLoopbackHost } from "../src/host.mjs";

test("bootstrap stays loopback; LAN hosts are allowed for the table", () => {
  assert.equal(isLoopbackHost("127.0.0.1:5173"), true);
  assert.equal(isLoopbackHost("localhost"), true);
  assert.equal(isLoopbackHost("::1"), true);
  assert.equal(isLoopbackHost("[::1]:5173"), true);
  assert.equal(isLoopbackHost("192.168.1.8:5173"), false);
  assert.equal(isAllowedHost("192.168.1.8"), true);
  assert.equal(isAllowedHost("10.0.0.2"), true);
  assert.equal(isAllowedHost("172.16.0.1"), true);
  assert.equal(isAllowedHost("169.254.1.1"), true);
  assert.equal(isAllowedHost("localhost:5173"), true);
  assert.equal(isAllowedHost("8.8.8.8"), false);
});
