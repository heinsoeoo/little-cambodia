import { test } from "node:test";
import assert from "node:assert/strict";
import { watchGameUpdates } from "../src/pwa-updates.js";
function setup() {
  const registration = new EventTarget(),
    serviceWorker = new EventTarget(),
    events = new EventTarget(),
    page = new EventTarget();
  let time = 0,
    checks = 0,
    reloads = 0,
    online = true;
  const notices = [],
    messages = [];
  serviceWorker.controller = {};
  registration.update = async () => {
    checks++;
  };
  const updater = watchGameUpdates({
    registration,
    serviceWorker,
    events,
    page,
    onAvailable: (ready) => notices.push(ready),
    reload: () => reloads++,
    now: () => time,
    isOnline: () => online,
  });
  return {
    registration,
    serviceWorker,
    events,
    page,
    updater,
    notices,
    messages,
    get checks() {
      return checks;
    },
    get reloads() {
      return reloads;
    },
    advance() {
      time += 11000;
    },
    offline(value) {
      online = !value;
    },
  };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));
test("installed game checks at launch, resume and reconnect while coalescing duplicate events", async () => {
  const s = setup();
  await flush();
  assert.equal(s.checks, 1);
  s.events.dispatchEvent(new Event("focus"));
  await flush();
  assert.equal(s.checks, 1);
  s.advance();
  s.page.hidden = true;
  s.page.dispatchEvent(new Event("visibilitychange"));
  await flush();
  assert.equal(s.checks, 1);
  s.page.hidden = false;
  s.page.dispatchEvent(new Event("visibilitychange"));
  await flush();
  assert.equal(s.checks, 2);
  s.advance();
  s.offline(true);
  s.events.dispatchEvent(new Event("pageshow"));
  await flush();
  assert.equal(s.checks, 2);
  s.offline(false);
  s.events.dispatchEvent(new Event("online"));
  await flush();
  assert.equal(s.checks, 3);
});
test("downloaded update is announced but only explicit acceptance activates and reloads once", async () => {
  const s = setup();
  await flush();
  s.registration.installing = new EventTarget();
  s.registration.dispatchEvent(new Event("updatefound"));
  s.registration.waiting = {
    postMessage: (message) => s.messages.push(message),
  };
  s.registration.installing.dispatchEvent(new Event("statechange"));
  await flush();
  assert.deepEqual(s.notices, [true]);
  assert.equal(s.reloads, 0);
  assert.equal(s.messages.length, 0);
  s.updater.apply();
  s.updater.apply();
  assert.deepEqual(s.messages, [{ type: "ACTIVATE_UPDATE" }]);
  s.registration.waiting = null;
  s.serviceWorker.controller = {};
  s.serviceWorker.dispatchEvent(new Event("controllerchange"));
  s.serviceWorker.dispatchEvent(new Event("controllerchange"));
  assert.equal(s.reloads, 1);
});
test("another window activating an update does not interrupt the running game", async () => {
  const s = setup();
  await flush();
  s.serviceWorker.controller = {};
  s.serviceWorker.dispatchEvent(new Event("controllerchange"));
  assert.equal(s.reloads, 0);
  assert.deepEqual(s.notices, [true]);
  s.updater.apply();
  assert.equal(s.reloads, 1);
});
test("failed checks do not break the game and retry after the next resume", async () => {
  const s = setup();
  await flush();
  s.registration.update = async () => {
    throw Error("offline");
  };
  s.advance();
  await s.updater.check();
  assert.equal(s.reloads, 0);
  s.advance();
  await s.updater.check();
  assert.deepEqual(s.notices, []);
});

test("first service-worker activation does not reload, but a later accepted update does", async () => {
  const registration = new EventTarget(),
    serviceWorker = new EventTarget(),
    events = new EventTarget(),
    page = new EventTarget();
  serviceWorker.controller = null;
  registration.update = async () => {};
  let reloads = 0;
  const updates = watchGameUpdates({
    registration,
    serviceWorker,
    events,
    page,
    onAvailable() {},
    reload: () => reloads++,
  });
  serviceWorker.controller = {};
  serviceWorker.dispatchEvent(new Event("controllerchange"));
  assert.equal(reloads, 0);
  registration.waiting = { postMessage() {} };
  updates.apply();
  serviceWorker.controller = {};
  serviceWorker.dispatchEvent(new Event("controllerchange"));
  assert.equal(reloads, 1);
  await flush();
});
