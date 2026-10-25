/**
 * 钱包系统（CORE ledger API）
 * 三币：金币 / 钻石 / 潮汐晶
 * 禁词：岛币 / 粉钻
 * 
 * economy.md §1.2 Demo 启动：金币 320 / 钻石 2 / 潮汐晶 0
 */

export type CurrencyId = 'gold' | 'diamond' | 'tide'

export type Wallet = {
  gold: number
  diamond: number
  tide: number
}

export const CURRENCY_LABELS: Record<CurrencyId, string> = {
  gold: '金币',
  diamond: '钻石',
  tide: '潮汐晶',
}

export const DEFAULT_WALLET: Wallet = {
  gold: 320,
  diamond: 2,
  tide: 0,
}

export function clampCurrency(n: number): number {
  return Math.max(0, Math.floor(n))
}

export function clampWallet(w: Wallet): Wallet {
  return {
    gold: clampCurrency(w.gold),
    diamond: clampCurrency(w.diamond),
    tide: clampCurrency(w.tide),
  }
}

export type TransactionResult = {
  ok: boolean
  wallet: Wallet
  reason?: string
}

export function credit(
  wallet: Wallet,
  currency: CurrencyId,
  amount: number,
  _reason?: string
): TransactionResult {
  if (amount <= 0) {
    return { ok: false, wallet, reason: 'amount must be positive' }
  }
  const next = { ...wallet }
  next[currency] = clampCurrency(wallet[currency] + amount)
  return { ok: true, wallet: next }
}

export function debit(
  wallet: Wallet,
  currency: CurrencyId,
  amount: number,
  _reason?: string
): TransactionResult {
  if (amount <= 0) {
    return { ok: false, wallet, reason: 'amount must be positive' }
  }
  if (wallet[currency] < amount) {
    return { ok: false, wallet, reason: 'insufficient balance' }
  }
  const next = { ...wallet }
  next[currency] = clampCurrency(wallet[currency] - amount)
  return { ok: true, wallet: next }
}

export function canAfford(wallet: Wallet, currency: CurrencyId, amount: number): boolean {
  return wallet[currency] >= amount
}
