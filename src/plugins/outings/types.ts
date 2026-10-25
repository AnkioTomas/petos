/**
 * 外出插件类型定义
 * petos.outings.work / petos.outings.study / petos.outings.trip
 */

import type { OccupationKind } from '../../engine/occupation'

export type JobDef = {
  id: string
  name: string
  kind: OccupationKind
  duration: number // ms (Demo 短时；正式小时级)
  rewards: {
    gold?: number
    xp?: number
    mood?: number
    attrs?: { charm?: number; intel?: number; strong?: number }
  }
  requirements?: {
    level?: number
    stage?: 'baby' | 'teen' | 'youth' | 'adult'
  }
  description?: string
}

export type OutingState = {
  active: boolean
  jobId: string | null
  startedAt: number | null
  duration: number | null
}

export const OUTING_LABELS: Record<OccupationKind, string> = {
  work: '兼职码头',
  study: '邻岛学堂',
  trip: '远岛散步',
}
