---
name: CMS source test runner
description: Source-level API integration tests need the workspace TypeScript resolver and ESM-safe path handling.
---

Use the workspace `tsx` loader for API tests that import the Express app directly; the server's bundled build supplies CommonJS globals that do not exist in source ESM. Prefer `import.meta.dirname` for filesystem paths so both source tests and the bundle resolve static assets consistently.

**Why:** The API server is authored as ESM but its production bundler injects `__dirname`; running the source app under Node otherwise fails before any route assertions execute.

**How to apply:** Keep source integration tests on the same resolver as the workspace and avoid introducing test-only global shims for path resolution.