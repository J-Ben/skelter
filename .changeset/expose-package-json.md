---
"react-zero-skeleton": patch
---

`react-zero-skeleton/package.json` is now exported (tools reading the package version no longer fail with `ERR_PACKAGE_PATH_NOT_EXPORTED`), and the `types` condition is listed first in `exports` so TypeScript resolves it with every `moduleResolution`.
