/**
 * 糯糯档案面板（CORE）
 * redesign.md §4.3 核心独立面板：糯糯档案
 * 等级/属性/形态只读+核心写
 */

import type { Needs } from '../engine/needs'
import { NEED_LABELS, CRITICAL_THRESHOLD, LOW_THRESHOLD } from '../engine/needs'
import type { GrowthState } from '../engine/growth'
import { STAGE_LABELS, FORM_LABELS, formForStage, xpProgressInStage } from '../engine/growth'
import type { Wallet } from '../engine/wallet'
import { CURRENCY_LABELS } from '../engine/wallet'

type Props = {
  needs: Needs
  growth: GrowthState
  wallet: Wallet
  petName?: string
  onClose: () => void
}

function needStatus(v: number): string {
  if (v <= CRITICAL_THRESHOLD) return '危急'
  if (v <= LOW_THRESHOLD) return '偏低'
  if (v >= 80) return '良好'
  return '正常'
}

function needColor(v: number): string {
  if (v <= CRITICAL_THRESHOLD) return '#e85d5d'
  if (v <= LOW_THRESHOLD) return '#e8a85d'
  return '#7bc96f'
}

export function ProfilePanel({ needs, growth, wallet, petName = '糯糯', onClose }: Props) {
  const form = formForStage(growth.stage)
  const prog = xpProgressInStage(growth)
  
  return (
    <div className="profile-panel">
      <div className="profile-header">
        <h3>{petName}档案</h3>
        <button type="button" className="panel-close" onClick={onClose}>
          关闭
        </button>
      </div>
      
      <section className="profile-section">
        <h4>基本信息</h4>
        <div className="profile-info-grid">
          <div className="info-row">
            <span className="info-label">形态</span>
            <span className="info-value">{FORM_LABELS[form]}</span>
          </div>
          <div className="info-row">
            <span className="info-label">阶段</span>
            <span className="info-value">{STAGE_LABELS[growth.stage]}</span>
          </div>
          <div className="info-row">
            <span className="info-label">等级</span>
            <span className="info-value">Lv.{growth.level}</span>
          </div>
          <div className="info-row">
            <span className="info-label">经验</span>
            <span className="info-value">
              {growth.xp} XP
              {prog.nextAt && <span className="sub"> / {prog.nextAt}</span>}
            </span>
          </div>
        </div>
      </section>
      
      <section className="profile-section">
        <h4>状态</h4>
        <div className="profile-needs-grid">
          {(Object.keys(NEED_LABELS) as (keyof Needs)[]).map((key) => (
            <div key={key} className="need-item">
              <div className="need-header">
                <span className="need-name">{NEED_LABELS[key]}</span>
                <span className="need-status" style={{ color: needColor(needs[key]) }}>
                  {needStatus(needs[key])}
                </span>
              </div>
              <div className="need-bar-track">
                <div 
                  className="need-bar-fill"
                  style={{ 
                    width: `${needs[key]}%`,
                    backgroundColor: needColor(needs[key])
                  }}
                />
              </div>
              <span className="need-value">{Math.round(needs[key])}/100</span>
            </div>
          ))}
        </div>
      </section>
      
      <section className="profile-section">
        <h4>钱包</h4>
        <div className="profile-wallet-grid">
          <div className="wallet-row">
            <span className="wallet-label">{CURRENCY_LABELS.gold}</span>
            <span className="wallet-value gold">{wallet.gold}</span>
          </div>
          <div className="wallet-row">
            <span className="wallet-label">{CURRENCY_LABELS.diamond}</span>
            <span className="wallet-value diamond">{wallet.diamond}</span>
          </div>
          <div className="wallet-row">
            <span className="wallet-label">{CURRENCY_LABELS.tide}</span>
            <span className="wallet-value tide">{wallet.tide}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
