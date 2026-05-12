#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Pipe a newline so drizzle-kit selects the default "No, don't truncate" option
# when it prompts about adding unique constraints to existing tables.
echo "" | pnpm --filter @workspace/db run push-force
