# Polyfill (for testing only) for TC39 Time Zone Canonicalization proposal

This polyfill is only for testing the TC39 [Time Zone Canonicalization proposal](https://github.com/tc39/proposal-canonical-tz).
The sole purpose of this polyfill is to run [Test262](https://github.com/tc39/test262) tests.
DO NOT use it in production!

This proposal's polyfill is stacked on top of the [Temporal for-testing-only polyfill](https://github.com/tc39/proposal-temporal).

For ease of development, this proposal's polyfill code lives in the [canonical-tz-polyfill](https://github.com/tc39/proposal-temporal/commits/canonical-tz-polyfill) branch of the Temporal proposal repo.
The polyfill changes are the top commit in that branch.

The <20 lines of changes that this proposal makes to the Temporal polyfill can be found in the [polyfill.diff](./polyfill.diff) in the same directory as this README file.
To refresh this file from the branch listed above, run [refresh_polyfill_code.sh](../refresh_polyfill_code.sh) in the root of this repo.
