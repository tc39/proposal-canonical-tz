# Polyfill (for testing only) for TC39 Time Zone Canonicalization proposal

This polyfill is only for testing the TC39 [Time Zone Canonicalization proposal](https://github.com/tc39/proposal-canonical-tz).
The sole purpose of this polyfill is to run [Test262](https://github.com/tc39/test262) tests.
DO NOT use it in production!

Like this proposal's spec text, the polyfill is stacked on top of an editorial PR ([tc39/proposal-temporal#2573](https://github.com/tc39/proposal-temporal/pull/2573)) to the Temporal proposal.

For ease of development, this proposal's polyfill changes&mdash;about 20 lines&mdash;live in a single commit at the top of the [canonical-tz-polyfill](https://github.com/tc39/proposal-temporal/commits/canonical-tz-polyfill) branch of the Temporal proposal repo.
These changes are also checked into this repo as [polyfill.diff](./polyfill.diff) in the same directory as this README.

## Testing this proposal

Test262 tests are available in the [proposal-canonical-tz-tests](https://github.com/justingrant/test262/tree/proposal-canonical-tz-tests) branch of a Test262 fork.
A draft PR for initial Test262 tests is available at [tc39/test262#3837](https://github.com/tc39/test262/pull/3837), although this PR is not expected to be merged unless this proposal reaches Stage 3.
The full surface area of this proposal is expected to be covered by Test262 tests by mid-June 2023.

### Test roadmap

- [x] DONE Add lightweight "Demitasse" tests in [test/canonicaltz.mjs](./test/canonicaltz.mjs) that cover this proposal's full surface area
- [x] DONE Fix 15 existing Test262 tests that were broken by this proposal, because they assumed that time zone identifiers are always canonicalized
- [x] DONE Open a Test262 draft PR
- [x] Migrate `Temporal.TimeZone.p.equals` (the only new API in this proposal) Demitasse tests to Test262
- [x] Migrate `Temporal.TimeZone` Demitasse tests to Test262
- [ ] Migrate `Temporal.ZonedDateTime` Demitasse tests to Test262
- [ ] Migrate `Intl.DateTimeFormat` Demitasse tests to Test262
- [ ] Remove Demitasse tests from this repo and from CI workflows

### How to run tests

Before running tests, the polyfill code from the proposal-temporal branch linked above must be current in the `temporal` submodule in this repo.
To do this, use `npm run refresh-polyfill` from the root of this repo.
This script will also regenerate `polyfill.diff`, which should be checked in after any polyfill changes are pushed.

Once the polyfill code is updated, use `npm test` to run tests.
To validate that this proposal doesn't break anything in Temporal, all 6000+ Temporal tests are run in addition to tests added or changed by this proposal.
It takes 1-2 minutes on a fast machine to run all these tests using [`@js-temporal/temporal-test262-runner`](https://www.npmjs.com/package/@js-temporal/temporal-test262-runner).

In CI, `npm run refresh-polyfill-ci` must be run before running tests. This script acts the same as `npm run refresh-polyfill` except:
* If `polyfill.diff` is out of date, it fails with an error because we don't want PRs to be merged with an outdated polyfill diff
* It won't build the polyfill because building happens later as part of testing scripts

## Production polyfill plans

There is no plan to provide a separate production polyfill for this proposal, because it's so tightly integrated with Temporal.
Instead, if this proposal makes it to Stage 4, we'll work with the maintainers of Temporal polyfills to ensure that the small number of changes in this proposal are integrated into those production polyfills.
