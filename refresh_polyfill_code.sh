#!/bin/bash

# Get latest contents of canonical-tz-polyfill branch of proposal-temporal
git submodule update --init --remote --force --recursive

# Regenerate the patch file of the (few) changes in this proposal's polyfill
# The polyfill changes are in one commit at HEAD of the submodule's branch.
cd temporal
git diff HEAD~1 > ../polyfill/polyfill.diff
cd ..

# If not in CI, build the polyfill to make sure it works
# In CI, building will happen as part of testing.
if [ -n "$CI" ]; then
  if [ -n "$(git status --porcelain)" ]; then 
    # Uncommitted changes because latest diff isn't checked in
    echo "polyfill/polyfill.diff is out of date. Next steps:"
    echo "1. npm run refresh-polyfill"
    echo "2. Commit the new polyfill/polyfill.diff"
    exit 1
  fi
else
  # When running outside CI, validate that the polyfill still builds
  cd tenporal/polyfill
  npm run build
fi
