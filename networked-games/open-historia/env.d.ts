import type { WorkerEnv } from "./lib/worker-env";

declare global {
  interface CloudflareEnv extends WorkerEnv {}
}

export {};