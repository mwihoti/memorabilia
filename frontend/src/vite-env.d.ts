/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WORLD_ADDRESS: string
  readonly VITE_RPC_URL: string
  readonly VITE_TORII_URL: string
  readonly VITE_BOT_USERNAME?: string
  readonly VITE_API_URL?: string
  readonly VITE_ENV: string
  readonly VITE_NETWORK: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

