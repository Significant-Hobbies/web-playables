/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_URL?: string;
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_SAASMAKER_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}