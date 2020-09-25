// Copyright (C) 2020 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.instant.fromepochmicroseconds
---*/

assert.throws(TypeError, () => Temporal.Instant.fromEpochMicroseconds.call(undefined, 10n), "undefined");
assert.throws(TypeError, () => Temporal.Instant.fromEpochMicroseconds.call(null, 10n), "null");
assert.throws(TypeError, () => Temporal.Instant.fromEpochMicroseconds.call(true, 10n), "true");
assert.throws(TypeError, () => Temporal.Instant.fromEpochMicroseconds.call("test", 10n), "string");
assert.throws(TypeError, () => Temporal.Instant.fromEpochMicroseconds.call(Symbol(), 10n), "Symbol");
assert.throws(TypeError, () => Temporal.Instant.fromEpochMicroseconds.call(7, 10n), "number");
assert.throws(TypeError, () => Temporal.Instant.fromEpochMicroseconds.call(7n, 10n), "bigint");
assert.throws(TypeError, () => Temporal.Instant.fromEpochMicroseconds.call({}, 10n), "Non-callable object");
