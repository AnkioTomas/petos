/// <reference types="vite/client" />

import type { PetApi } from '../electron/preload'

declare global {
  interface Window {
    pet: PetApi
  }
}

export {}
