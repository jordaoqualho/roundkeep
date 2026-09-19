import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allowSocketRequest,
  isAllowedHost,
  isLoopbackAddress,
  isLoopbackHost,
  isLoopbackRequest,
  isSocketIoPath,
} from "../src/host.mjs";

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

test("isLoopbackAddress accepts loopback IPv4, IPv6, and IPv4-mapped forms", () => {
  assert.equal(isLoopbackAddress("127.0.0.1"), true);
  assert.equal(isLoopbackAddress("::1"), true);
  assert.equal(isLoopbackAddress("::ffff:127.0.0.1"), true);
  assert.equal(isLoopbackAddress("::FFFF:127.0.0.1"), true);
  assert.equal(isLoopbackAddress("192.168.1.8"), false);
  assert.equal(isLoopbackAddress("10.0.0.2"), false);
  assert.equal(isLoopbackAddress("8.8.8.8"), false);
  assert.equal(isLoopbackAddress(""), false);
  assert.equal(
    isLoopbackRequest({ socket: { remoteAddress: "::ffff:127.0.0.1" } }),
    true,
  );
  assert.equal(
    isLoopbackRequest({
      socket: {
        remoteAddress: "192.168.1.8",
        address: () => ({ address: "127.0.0.1" }),
      },
    }),
    false,
  );
  assert.equal(
    isLoopbackRequest({
      socket: { address: () => ({ address: "::1" }) },
    }),
    true,
  );
});

test("socket.io paths skip the SPA handler; upgrades use the host allowlist", () => {
  assert.equal(isSocketIoPath("/socket.io/"), true);
  assert.equal(isSocketIoPath("/socket.io"), true);
  assert.equal(isSocketIoPath("/api/health"), false);
  let allowed;
  allowSocketRequest({ headers: { host: "192.168.1.8:5173" } }, (err: Error | null, ok: boolean) => {
    assert.equal(err, null);
    allowed = ok;
  });
  assert.equal(allowed, true);
  allowSocketRequest({ headers: { host: "8.8.8.8" } }, (err: Error | null, ok: boolean) => {
    assert.equal(err, null);
    allowed = ok;
  });
  assert.equal(allowed, false);
});
