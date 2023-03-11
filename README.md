# Handling Time Zone Canonicalization Changes

Time zones in ECMAScript rely on IANA Time Zone Database ([TZDB](https://www.iana.org/time-zones)) identifiers like `America/Los_Angeles` or `Asia/Tokyo`.
This proposal improves developer experience when the canonical identifier of a time zone is changed in TZDB, for example from `Europe/Kiev` to `Europe/Kyiv`.

## Status

This proposal is currently [Stage 0](https://github.com/tc39/proposals/blob/main/stage-0-proposals.md) following the [TC39 process](https://tc39.es/process-document/).
Its champions are planning to ask to advance to [Stage 1](https://github.com/tc39/proposals#stage-1) in the upcoming March 2023 TC39 plenary meeting.

Because this proposal is "stacked" on top of the Temporal proposal, its repo is temporarily built on top of a clone of the [`proposal-temporal`](https://github.com/tc39/proposal-temporal) repo.
If this proposal progresses forward in the TC39 stages and spec text and a polyfill are added, its repo will be cleaned up for easier review.
In the meantime, please ignore everything in this repo other than this README.

## Champions

- Justin Grant ([@justingrant](https://github.com/justingrant))
- Richard Gibson ([@gibson042](https://github.com/gibson042/))

## Contents

- [Motivation](#Motivatione)
- [Definitions](#Definitions)
- [Proposed Solution](#proposed-solution)
- [References](#References)

## Motivation

### Variation between implementations + spec doesn't match web reality

```javascript
Temporal.TimeZone.from('Asia/Kolkata');
// => Asia/Kolkata (Firefox)
// => Asia/Calcutta (Chrome, Safari, Node -- does not conform to ECMA-402)
```

### Vague spec text: _"in the IANA Time Zone Database"_

```javascript
// TZDB has build options and the spec is silent on which to pick.
// Default build options, while conforming, are bad for users.
Temporal.TimeZone.from('Atlantic/Reykyavik');
// => Africa/Abidjan
Temporal.TimeZone.from('Europe/Stockholm');
// => Europe/Berlin
Temporal.TimeZone.from('Europe/Zagreb');
// => Europe/Belgrade
```

### User Complaints

- [CLDR-9892: 'Asia/Calcutta', 'Asia/Saigon' and 'Asia/Katmandu' are canonical even though they became obsolete in 1993](https://unicode-org.atlassian.net/browse/CLDR-9892)
- [Chromium 580195: Asia/Calcutta Timezone Identifier should be replaced by Asia/Kolkata](https://bugs.chromium.org/p/chromium/issues/detail?id=580195)
- [moment.tz.guess() in chrome is different from moment.tz.guess() in IE · Issue #453 · moment/moment-timezone ](https://github.com/moment/moment-timezone/issues/453)
- [CLDR-5612: Timezones very outdated](https://unicode-org.atlassian.net/browse/CLDR-5612)
- [CLDR-9718: Rename from Asia/Calcutta to Asia/Kolkata in Zone - Tzid mapping and windows mapping](https://unicode-org.atlassian.net/browse/CLDR-9718)
- [Incorrect canonical time zone name for Asia/Kolkata · Issue #1076 · tc39/proposal-temporal](https://github.com/tc39/proposal-temporal/issues/1076)
- [[tz] Kyiv not Kiev](https://mm.icann.org/pipermail/tz/2021-January/029695.html) (from [IANA TZDB mailing list](https://mm.icann.org/pipermail/tz/)).
- It's easy to find dozens more.

### Can't depend on static data behaving the same over time

```shell
> npm test
# result = someFunctionToTest('Asia/Calcutta');
# assertEqual(result.timeZone.id, 'Asia/Calcutta');
✅
> brew upgrade node
> npm test
❌
Expected: 'Asia/Calcutta'
Actual: 'Asia/Kolkata'
```

### Comparing persisted identifiers with `===` is unreliable

```javascript
userProfile.timeZoneId = Temporal.Now.timeZoneId();
userProfile.save();
// 1 year later (after canonicalization changed)
userProfile.load();
if (userProfile.timeZoneId !== Temporal.Now.timeZoneId()) {
  alert('You moved!');
}
```

### Temporal makes these problems more disruptive

```javascript
// Today, canonicalization is invisible for most common use cases.
// Intl.DateTimeFormat `format` localizes time zone names.
// Only `resolvedOptions()` exposes the underlying IANA time zone.
timestamp = '2023-03-10T12:00:00Z';
timeZone = 'Asia/Kolkata';
dtf = new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'long' });
dtf.format(new Date(timestamp));
// => '3/10/2023, India Standard Time'
dtf.resolvedOptions().timeZone;
// => 'Asia/Kolkata' (Firefox)
// => 'Asia/Calcutta' (Chrome, Safari, Node)

// In Temporal, canonical identifiers are *very* noticeable.
zdt = Temporal.Instant.from(timestamp).toZonedDateTimeISO({ timeZone });
zdt.timeZoneId;
// => 'Asia/Kolkata' (Firefox)
// => 'Asia/Calcutta' (Chrome, Safari, Node)
zdt.getTimeZone().id;
// => 'Asia/Kolkata' (Firefox)
// => 'Asia/Calcutta' (Chrome, Safari, Node)
zdt.getTimeZone().toString();
// => 'Asia/Kolkata' (Firefox)
// => 'Asia/Calcutta' (Chrome, Safari, Node)
zdt.toString();
// => '2023-03-10T17:30:00+05:30[Asia/Kolkata]' (Firefox)
// => '2023-03-10T17:30:00+05:30[Asia/Calcutta]' (Chrome, Safari, Node)
```

## Definitions

- **Identifier** - Time zone name in TZDB (and accepted in ECMAScript).
  Identifiers are ASCII-only and are case-insensitive.
  There are currently 594 identifiers (avg length 14.3 chars).
  Currently fewer than 5 identifiers are added per year.
- **Zone** - TZDB term for a collection of rules named by an Identifier (see [How to Read the tz Database](https://data.iana.org/time-zones/tz-how-to.html) and [Theory and pragmatics](https://data.iana.org/time-zones/theory.html)).
  There are currently 461 Zones (avg length 14.9 chars).
- **Link** - TZDB term for an Identifier that lacks its own Zone record but instead targets another Identifier and uses its rules.
  When a Zone is renamed, a Link from the old name to the new one is added to [`backward`](https://github.com/eggert/tz/blob/main/backward).
  Renaming to update the spelling of a city happens every few years.
  There are currently 133 Links (avg length 12.2 chars).
- **CLDR Canonicalization** - Zone &amp; Link [data](https://github.com/unicode-org/cldr-json/blob/main/cldr-json/cldr-bcp47/bcp47/timezone.json) used by V8 & WebKit (via ICU libraries)
- **IANA Canonicalization** - Zone &amp; Link [data](https://github.com/tc39/proposal-temporal/issues/2509#issuecomment-1461418026) used by Firefox (in custom TZDB build)

## Proposed Solution - Summary

Steps below are designed to be "severable"; if blocked due to implementation complexity and/or lack of consensus, we can still move forward on the others.

### Reduce variation between implementations, and between implementations and spec

1. **[Simplify abstract operations](#Editorial-cleanup-of-identifier-related-Abstract-Operations)** dealing with time zone identifiers. (editorial only)
2. **[Align spec](#Align-spec-with-implementation-behavior)** to support how implementations actually behave.
3. **[Help V8 and WebKit update 13 out-of-date canonicalizations](#Fix-out-of-date-canonicalizations-in-V8WebKit)** like `Asia/Calcutta`, `Europe/Kiev`, and `Asia/Saigon` before wide Temporal adoption makes this painful. (no spec text required)
4. [**Prescriptive spec text to reduce divergence between implementations.**](#Prescriptive-spec-text-to-reduce-divergence-between-implementations)
   This step requires finding common ground between implementers as well as TG2 (the ECMA-402 team) about how canonicalization should work.

### Reduce impact of canonicalization changes

5. [**Avoid observable following of Links.**](#Defer-Link-traversing-canonicalization)
   If canonicalization changes don't affect existing code, then it's much less likely for future canonicalization changes to break the Web.
   Because canonicalization is implementation-defined, this change may (or may not; needs research) be safe to ship after Temporal Stage 4, but best to not wait too long.

```javascript
Temporal.TimeZone.from('Asia/Calcutta');
// => Asia/Kolkata (current Temporal behavior on Firefox)
// => Asia/Calcutta (proposed: don't follow Links by default)
```

6. [**Add `TimeZone.prototype.equals`.**](#Add-TimeZoneprototypeequals)
   Because (5) would stop canonicalizing IDs upon `TimeZone` object creation, it'd be helpful to have an ergonomic way to check if two `TimeZone` objects represented the same Zone.
   This can be deferred to a later proposal if needed.

```javascript
// More ergonomic canonical-equality testing
Temporal.TimeZone.from('Asia/Calcutta').equals('Asia/Kolkata');
// => true
```

## Proposed Solution - Details

## Editorial cleanup of identifier-related Abstract Operations

Currently, the Temporal (and pre-Temporal) ECMA-262 and ECMA-402 specs contain several implementation-defined abstract operations dealing with time zone identifiers, as well as several 262 AOs overridden in 402.

Even without making any normative changes, we can simplify the specs quite a bit.
In the process, we can reduce the delta required for the proposed normative changes.
The current plan is to make these editorial changes in the next month or two while Temporal is still in Stage 3.

**`AvailableTimeZoneIdentifiers()`** - Rename of [Temporal AvailableTimeZones](https://tc39.es/proposal-temporal/#sec-availabletimezones).
Change the returned value from an implementation-defined List of Strings to an implementation-defined List of Records, each composed of:

- `[[Identifier]]`: identifier in the IANA TZDB
- `[[CanonicalIdentifier]]`: identifier of transitive IANA Link target (following as many Links as necessary to reach a Zone), or `undefined` for non-Link identifiers

This AO would be the **only** implementation-defined AO for time zone identifiers.
The default implementation would return a one-record List: `« { [[Identifier]]: *"UTC"*, [[CanonicalIdentifier]]: *undefined* } »`.

**`IsAvailableTimeZoneIdentifier(_identifier_)`** - Rename of [Temporal IsAvailableTimeZoneName](https://tc39.es/proposal-temporal/#sec-isavailabletimezonename) (which performs case-insensitive searching against AvailableTimeZones() with a minor change to look at `[[Identifier]]`.
Can't throw.

**`GetAvailableTimeZoneIdentifier(_identifier_)`** - Like `IsAvailableTimeZoneIdentifier`, but returns `[[Identifier]]` if there's a case-insensitive match, or `*undefined*` if not matched. Except: if `[[LinkTarget]]` is `*"UTC"*` then return `*"UTC"*`. This AO is new and can be used to fetch a case-normalized identifier. Can't throw.

> ISSUE: should we keep the UTC exception here?
> Currently, UTC is special-cased in the spec, and we expect that a common ECMAScript code pattern will be `if (foo.id === 'UTC') { ... }`.
> Also, the city-renaming problem never affects UTC zones so many of the problems noted above don't apply to UTC because UTC cannot turn into a Link in the future.
> Also, the canonical identifier in IANA is `Etc/UTC`, not `UTC`, so the spec is already doing something unusual here, which we don't want to change for backwards compatibility reasons.
> So there's not yet a clear answer here.
> Discussion needed.

**`GetCanonicalTimeZoneIdentifier(_identifier_)`** - Rename of [ECMA-402 CanonicalizeTimeZoneName](https://tc39.es/ecma402/#sec-canonicalizetimezonename), but moved to ECMA-262 and updated to no longer be implementation-defined. Similar implementation to `GetAvailableTimeZoneIdentifier`, but will return `[[LinkTarget]]` when non-empty and `[[Identifier]]` otherwise.
Can't throw.

## Align spec with implementation behavior

Currently, the ECMA-402 spec (and the 402 section of the Temporal spec) tells implementers to use TZDB, but doesn't provide enough detail to differentiate the myriad ways that TZDB data can be built.
(TZDB's makefile has a number of build options that yield normatively different results.)

In this step, we'd update the spec to provide more guidance for implementers about which TZDB data is in vs. out of scope, especially around canonicalization behavior.

The goal would be to be broad enough to encompass existing implementations in Firefox and V8/WebKit but not any broader than that.
Specifically, we want to tighten current language like this which AFAICT is wrong and was never implemented:

```
1. If _ianaTimeZone_ is a Link name, let _ianaTimeZone_ be the String value of the corresponding Zone name as specified in the file <code>backward</code> of the IANA Time Zone Database.
```

There's useful info in [@anba](https://github.com/anba)'s comments [here](https://github.com/tc39/proposal-temporal/issues/2509#issuecomment-1461418026) that could be used as a starting point.

Note that these spec text changes would likely go into `AvailableTimeZoneIdentifiers` (the only implementation-defined AO related to TZDB identifiers) and would be removed from their current home in `GetCanonicalTimeZoneName`.

## Fix out-of-date canonicalizations in V8/WebKit

The list below shows 13 Links which have been superseded in IANA and Firefox, but still canonicalize to the "old" identifier in CLDR (and hence ICU and therefore V8 and WebKit).

The work here would be partnering with representatives from V8 and WebKit (and maybe ICU and CLDR too) to see how we can get V8/WebKit onto the modern canonical forms of these identifiers.

```javascript
// [0] => canonical in V8/WebKit (from CLDR)
// [1] => canonical in Firefox (from IANA)
// [2] => non-canonical Link (if present)
const outofDateLinks = [
  ['Asia/Calcutta', 'Asia/Kolkata'],
  ['Europe/Kiev', 'Europe/Kyiv'],
  ['Asia/Saigon', 'Asia/Ho_Chi_Minh'],
  ['Asia/Rangoon', 'Asia/Yangon'],
  ['Asia/Ulaanbaatar', 'Asia/Ulan_Bator'],
  ['Asia/Katmandu', 'Asia/Kathmandu'],
  ['Africa/Asmera', 'Africa/Asmara'],
  ['America/Coral_Harbour', 'America/Atikokan'],
  ['Atlantic/Faeroe', 'Atlantic/Faroe'],
  ['America/Godthab', 'America/Nuuk'],
  ['Pacific/Truk', 'Pacific/Chuuk', 'Pacific/Yap'], // Chuuk is correct
  ['Pacific/Enderbury', 'Pacific/Kanton'], // Enderbury is uninhabited; Kanton is best
  ['Pacific/Ponape', 'Pacific/Pohnpei']
];
```

## Prescriptive spec text to reduce divergence between implementations

This step involves agreement between implementers and TG2 about how canonicalization should work.
It may require agreeing on (or recommending) which external source of canonicalization (IANA or CLDR) ECMAScript should rely on, and (if IANA) which TZDB build options should be used.
Making progress here requires input from specifiers and implementers who understand the tradeoffs involved.
Note that one acceptable outcome may be to “agree to disagree” as long as we can agree on most parts.
We don’t need perfect alignment to reduce ecosystem variance.

## Defer Link-traversing canonicalization

This normative change would defer Link traversal to enable a Link identifier to be stored in internal slots of `ZonedDateTime`, `TimeZone`, and perhaps `DateTimeFormat`, so that it can be returned back to the user.

The justification for this change is that canonicalization itself is problematic because it always makes at least some people unhappy: developers of existing code are annoyed when their code behaves differently, while other developers are annoyed if outdated identifiers are used.
To sidestep both problems, this proposed change would make canonicalization mostly invisible to Temporal users, except one place: time zone identifiers returned from `Temporal.Now`.

A tradeoff of this change is that comparing the string representation of `TimeZone` objects (or their `id` properties) would no longer be a reliable way to test for equality.
Therefore, (6) below proposes a new `TimeZone.prototype.equals` API.

This change requires the following normative edits:

- a) Change `GetCanonicalTimeZoneIdentifier` to `GetAvailableTimeZoneIdentifier` in places where user input identifiers are stored.
- b) Add `GetCanonicalTimeZoneIdentifier` calls before using identifiers for any other purpose than returning them back to ECMAScript code in `id`, `timeZoneId`, `toString`, and `toJSON`.
- c) Depending on what TG2 decides, maybe include `resolvedOptions().timeZone` to calls that are exempt from canonicalization. Or we could leave its existing canonicalized behavior for backwards compatibility.

An early proof-of-concept PR of these changes is here: https://github.com/tc39/proposal-canonical-tz/pull/1

A few performance-related notes:

- Storing user-input identifier strings is not necessary because identifiers are case-normalized by `GetCanonicalTimeZoneIdentifier` before storing.
  There are fewer than 600 identifiers, so built-in time zone identifiers could be stored as a 2-byte (or even 10-bit) indexes into a ~9KB array of ASCII strings.
- This change WOULD NOT require storing both original and canonical IDs in each `TimeZone` and `ZonedDateTime` instance.
  Implementations could choose to do this for ease of implementation, but they can also save a few bytes per object by canonicalizing just-in-time via a 2.3KB map of each identifier's index to its corresponding Zone's identifier's index.

## Add `TimeZone.prototype.equals`

The final step, which could be deferred to a later proposal, would expose Temporal's [`TimeZoneEquals`](https://tc39.es/proposal-temporal/#sec-temporal-timezoneequals) to ECMAScript code to enable developers to compare two time zones to see if they resolve to the same Zone.

```javascript
// More ergoonomic canonical-equality testing
Temporal.TimeZone.from('Asia/Calcutta').equals('Asia/Kolkata');
// => true
```

This `equals` pattern matches how other Temporal types like `ZonedDateTime` and `PlainDate` offer equality comparisons.

Behavior of `ZonedDateTime.prototype.equals` API would not change, because it (just like all other APIs other than those that return identifiers) would canonicalize before using time zone identifiers.

A reason to include this new API in this proposal instead of waiting until later is that it'd prevent the pattern `tz1.id === tz2.id` from becoming endemic in ECMAScript code, because that pattern will be broken by this proposal.

Without this API, testing for canonical equality is still possible, it's just less ergonomic:

```javascript
function canonicalEquals(zone1, zone2) {
  const instant = Temporal.Instant.fromNanoseconds(0n);
  const zdt1 = instant.toZonedDateTimeISO(zone1);
  const zdt2 = instant.toZonedDateTimeISO(zone2);
  return zdt1.equals(zdt2);
}
```

Longer-term extensions (out of scope to this proposal) could be added to force canonicalization at creation time:

```javascript
Temporal.TimeZone.from('Asia/Calcutta', { canonicalize: 'full' });
// => Asia/Kolkata
// Opt-in canonicalization
Temporal.TimeZone.canonicalize('Asia/Calcutta');
// => Asia/Kolkata
```

That said, exposing canonical identifiers has been a source of grief in every software platform.
So adding APIs that make canonicalization more visible might invite more user complaints.
This is another good reason to defer these kinds of APIs until a later proposal. :smile:

## TZDB size calculations

Source: https://raw.githubusercontent.com/unicode-org/cldr-json/main/cldr-json/cldr-bcp47/bcp47/timezone.json

```javascript
// all identifiers
ianaIdLists = Object.values(t.keyword.u.tz)
  .map((tz) => tz._alias)
  .filter((s) => s)
  .map((s) => s.split(/,* /g));
ids = ianaIdLists.flat();
zones = ianaIdLists.map((list) => list[0]);
links = ianaIdLists.flatMap((list) => list.slice(1));

[ids, zones, links].map((arr) => arr.length);
// => [594, 461, 133]

avgLength = (arr) => arr.join('').length / arr.length;
[ids, zones, links].map((arr) => avgLength(arr).toFixed(1));
// => [14.3, 14.9, 12.2]
```

CLDR Links and Zones above used in V8 and WebKit aren't exactly the same as IANA data used in Firefox.
But CLDR is close enough that the numbers above should be within 20% of Firefox stats.

## References

### ICU4X

Rust localization API (including Temporal-friendly [timezone API](https://github.com/unicode-org/icu4x/tree/main/components/timezone)) that's being implemented now.

See https://github.com/unicode-org/icu4x/issues/2909 for canonicalization API discussion.

### IANA Time Zone Database ([TZDB](https://www.iana.org/time-zones))

Standard repository of time zone data, including Link and Zone identifiers and data required to calculate the UTC offset of moments in time for any time zone.

Maintained via PRs to the [eggert/tz](https://github.com/eggert/tz) repo, with discussion on the [TZDB mailing list](https://mm.icann.org/pipermail/tz/).

The data in the TZDB repo is not intended to be used raw.
Instead, the repo's MAKEFILE offers various build options which will generate data files for use by applications.
Changes in build options can yield very different output, including large differences in canonicalization behavior.

One of the goals of this proposal is to define which of these build options should be used by ECMAScript implementations.

### [global-tz](https://github.com/JodaOrg/global-tz) repo

Provides pre-built TZDB data files using build options that are more aligned with the needs of Java (and also ECMAScript) than the default TZDB build options.

The files in global-tz are claimed (by the [TZDB News](https://github.com/eggert/tz/blob/27148539e699d9abe50df84371a077fdf2bc13de/NEWS#L427-L430) file) to be the same as the results of building TZDB with `make PACKRATDATA=backzone PACKRATLIST=zone.tab`.
This build configuration backs out undesirable (from ECMAScript's point of view) merging of unrelated time zones like `Atlantic/Reykyavik` and `Africa/Abidjan` that may diverge in the future.

Also, this build configuration is similar to the Zones and Links used by Firefox.

This repo is maintained by the champion of [JSR-310](https://jcp.org/en/jsr/detail?id=310), the current Java date/time API and maintainer of the [Joda](https://github.com/JodaOrg/joda-time) date/time API library which is used by older Java implementations and which JSR-310 was based on.

Note that the string serialization format of `Temporal.ZonedDateTime`, including use of IANA time zone identifiers, was designed to be interoperable with [`java.time.ZonedDateTime`](https://docs.oracle.com/javase/8/docs/api/java/time/ZonedDateTime.html).
In addition, ECMAScript's time zone use cases are similar to Java's.
So this may be a useful standard TZDB build configuration to consider recommending for in ECMAScript.
