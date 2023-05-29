# Polyfill (for testing only) for TC39 Time Zone Canonicalization proposal

This polyfill is only for testing the TC39 [Time Zone Canonicalization proposal](https://github.com/tc39/proposal-canonical-tz).
The sole purpose of this polyfill is to run [Test262](https://github.com/tc39/test262) tests.
DO NOT use it in production!

This proposal's polyfill is stacked on top of the [Temporal for-testing-only polyfill](https://github.com/tc39/proposal-temporal).

For ease of development, this proposal's polyfill code lives in the [canonical-tz-polyfill](https://github.com/tc39/proposal-temporal/commits/canonical-tz-polyfill) branch of the Temporal proposal repo.
This proposal's polyfill changes are the top commit in that branch.

The <20 lines of changes that this proposal makes to the Temporal polyfill can be found in the [polyfill.diff](./polyfill.diff) in the same directory as this README file.

## Testing this proposal

Some Test262 tests are available for this proposal, and more are being added soon.
The full surface area of this proposal is expected to be covered by Test262 tests by mid-June 2023.
Lightweight "Demitasse" tests are in [test/canonicaltz.mjs](./test/canonicaltz.mjs).
These tests already cover this proposal's full surface area, and are in the process of being migrated to Test262.
Once the Test262 migration is complete, these interim tests will be removed.

Before running tests, the polyfill code from the proposal-temporal branch linked above must be copied into the `lib` folder.
To do this, use `npm run refresh-polyfill` from the root of this repo.
This script will also regenerate `polyfill.diff`, which should be checked in after any polyfill changes are pushed.

In CI, `npm run refresh-polyfill-ci` must be run before running tests. This script acts the same as `npm run refresh-polyfill` except:
* If `polyfill.diff` is out of date, it fails with an error because we don't want PRs to be merged with an outdated polyfill diff
* It won't build the polyfill because building happens later as part of testing scripts

## Production polyfill plans

There is no plan to provide a separate production polyfill for this proposal, because it's so tightly integrated with Temporal.
Instead, if this proposal makes it to Stage 4, we'll work with the maintainers of Temporal polyfills to ensure that the small number of changes in this proposal are integrated into those production polyfills.
