// Minimal ambient declaration for the Vercel function runtime. Deliberately not
// @types/node: the main tsconfig has no `types` field, so installing it would pull
// Node globals into the browser code in src/ as well.
declare const process: { env: Record<string, string | undefined> };
