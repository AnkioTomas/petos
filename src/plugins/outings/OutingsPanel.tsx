/**
 * 外出面板组件（统一三类外出）
 */

import { useState, useEffect } from 'react'
import type { OccupationKind, OccupationState } from '../../engine/occupation'
import { RECALL_COEFFICIENT } from '../../engine/occupation'
import type { JobDef } from './types'
import { OUTING_LABELS } from './types'
import { getJobsByKind, getJobById } from './jobs'
import type { StageId } from '../../engine/growth'

type Props = {
  kind: OccupationKind
  occupation: OccupationState
  stage: StageId
  isWeak: boolean
  onStart: (job: JobDef) => void
  onRecall: () => void
  onClose: () => void
}

function formatTime(ms: number): string {
  const sec = Math.ceil(ms / 1000)
  const min = Math.floor(sec / 60)
  const s = sec % 60
  return min > 0 ? `${min}分${s}秒` : `${s}秒`
}

const STAGE_ORDER: StageId[] = ['baby', 'teen', 'youth', 'adult']

function meetsRequirements(job: JobDef, stage: StageId): boolean {
  if (!job.requirements?.stage) return true
  const reqIdx = STAGE_ORDER.indexOf(job.requirements.stage)
  const curIdx = STAGE_ORDER.indexOf(stage)
  return curIdx >= reqIdx
}

export function OutingsPanel({ kind, occupation, stage, isWeak, onStart, onRecall, onClose }: Props) {
  const jobs = getJobsByKind(kind)
  const [now, setNow] = useState(Date.now())
  
  const isOccupied = occupation.kind !== null
  const isThisKind = occupation.kind === kind
  const activeJob = occupation.jobId ? getJobById(occupation.jobId) : null
  
  useEffect(() => {
    if (!isOccupied) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [isOccupied])
  
  const elapsed = occupation.startedAt ? now - occupation.startedAt : 0
  const remaining = occupation.duration ? Math.max(0, occupation.duration - elapsed) : 0
  const progress = occupation.duration ? Math.min(1, elapsed / occupation.duration) : 0
  const isComplete = remaining === 0 && isThisKind

  return (
    <div className="outings-panel">
      <div className="outings-header">
        <h3>{OUTING_LABELS[kind]}</h3>
        <button type="button" className="panel-close" onClick={onClose}>
          关闭
        </button>
      </div>
      
      {isWeak && (
        <div className="outings-warning">
          身体虚弱，无法外出。请先休息恢复。
        </div>
      )}
      
      {isThisKind && activeJob && (
        <div className="outings-active">
          <div className="active-job-name">{activeJob.name}</div>
          <div className="active-job-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <span className="progress-text">
              {isComplete ? '已完成！' : `剩余 ${formatTime(remaining)}`}
            </span>
          </div>
          {!isComplete && (
            <div className="active-job-actions">
              <button type="button" className="recall-btn" onClick={onRecall}>
                召回（收益 ×{RECALL_COEFFICIENT}）
              </button>
            </div>
          )}
          {isComplete && (
            <div className="active-job-rewards">
              <span>奖励：</span>
              {activeJob.rewards.gold && <span className="reward gold">金币 +{activeJob.rewards.gold}</span>}
              {activeJob.rewards.xp && <span className="reward xp">经验 +{activeJob.rewards.xp}</span>}
              {activeJob.rewards.mood && <span className="reward mood">心情 +{activeJob.rewards.mood}</span>}
              {activeJob.rewards.attrs?.intel && <span className="reward attr">聪慧 +{activeJob.rewards.attrs.intel}</span>}
              {activeJob.rewards.attrs?.charm && <span className="reward attr">柔软 +{activeJob.rewards.attrs.charm}</span>}
              {activeJob.rewards.attrs?.strong && <span className="reward attr">身手 +{activeJob.rewards.attrs.strong}</span>}
              <button type="button" className="claim-btn" onClick={onRecall}>
                领取奖励
              </button>
            </div>
          )}
        </div>
      )}
      
      {isOccupied && !isThisKind && (
        <div className="outings-busy">
          正在{OUTING_LABELS[occupation.kind!]}中，无法同时外出。
        </div>
      )}
      
      {!isOccupied && !isWeak && (
        <div className="outings-list">
          {jobs.map((job) => {
            const canDo = meetsRequirements(job, stage)
            return (
              <div key={job.id} className={`job-card ${!canDo ? 'locked' : ''}`}>
                <div className="job-info">
                  <div className="job-name">{job.name}</div>
                  <div className="job-desc">{job.description}</div>
                  <div className="job-meta">
                    <span className="job-duration">时长: {formatTime(job.duration)}</span>
                    {job.requirements?.stage && (
                      <span className="job-req">需要: {job.requirements.stage === 'teen' ? '少年' : job.requirements.stage === 'youth' ? '青年' : '幼体'}</span>
                    )}
                  </div>
                </div>
                <div className="job-rewards">
                  {job.rewards.gold && <span className="reward gold">+{job.rewards.gold} 金币</span>}
                  {job.rewards.xp && <span className="reward xp">+{job.rewards.xp} XP</span>}
                  {job.rewards.mood && <span className="reward mood">+{job.rewards.mood} 心情</span>}
                </div>
                <button 
                  type="button" 
                  className="start-btn"
                  disabled={!canDo}
                  onClick={() => onStart(job)}
                >
                  {canDo ? '出发' : '未解锁'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
