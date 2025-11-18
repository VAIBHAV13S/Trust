/// <reference types="vite/client" />
/// <reference path="./types/window.d.ts" />

interface ImportMetaEnv {
  readonly VITE_ONECHAIN_PACKAGE_ID?: string;
  readonly VITE_ONECHAIN_RPC?: string;
  readonly VITE_ONECHAIN_CHAIN_ID?: string;
  readonly VITE_ONECHAIN_GAS_BUDGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
