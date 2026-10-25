/**
 * 事件总线（CORE）
 * plugin-spec.md §4.3
 */

export type EventPayload = Record<string, unknown>

export type EventListener = (payload: EventPayload) => void

export type EventBus = {
  on: (event: string, listener: EventListener) => () => void
  off: (event: string, listener: EventListener) => void
  emit: (event: string, payload?: EventPayload) => void
}

export function createEventBus(): EventBus {
  const listeners = new Map<string, Set<EventListener>>()

  const on = (event: string, listener: EventListener): (() => void) => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set())
    }
    listeners.get(event)!.add(listener)
    return () => off(event, listener)
  }

  const off = (event: string, listener: EventListener): void => {
    listeners.get(event)?.delete(listener)
  }

  const emit = (event: string, payload: EventPayload = {}): void => {
    const set = listeners.get(event)
    if (!set) return
    for (const listener of set) {
      try {
        listener(payload)
      } catch (e) {
        console.error(`[EventBus] Error in listener for ${event}:`, e)
      }
    }
  }

  return { on, off, emit }
}

export const EVENT_NAMES = {
  CARE_USED: 'care.used',
  NEEDS_CHANGED: 'needs.changed',
  NEEDS_WEAK_ENTER: 'needs.weak.enter',
  NEEDS_WEAK_EXIT: 'needs.weak.exit',
  WALLET_CHANGED: 'wallet.changed',
  GROWTH_LEVELUP: 'growth.levelup',
  OCCUPATION_START: 'occupation.start',
  OCCUPATION_END: 'occupation.end',
  DAY_ROLLOVER: 'day.rollover',
  PLUGIN_ENABLE: 'plugin.enable',
  PLUGIN_DISABLE: 'plugin.disable',
  SAVE_AFTER: 'save.after',
  LOAD_AFTER: 'load.after',
} as const
