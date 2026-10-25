/**
 * 今日岛课面板
 */

import type { DailyQuest } from './daily'

type Props = {
  quests: DailyQuest[]
  onClaim: (questId: string) => void
  onClose: () => void
}

export function DailyQuestsPanel({ quests, onClaim, onClose }: Props) {
  const allClaimed = quests.every(q => q.claimed)
  const claimedCount = quests.filter(q => q.claimed).length
  
  return (
    <div className="daily-quests-panel">
      <div className="quests-header">
        <h3>今日岛课</h3>
        <span className="quests-progress">{claimedCount}/{quests.length} 已领取</span>
        <button type="button" className="panel-close" onClick={onClose}>
          关闭
        </button>
      </div>
      
      <div className="quests-list">
        {quests.map((quest) => (
          <div 
            key={quest.id} 
            className={`quest-card ${quest.claimed ? 'claimed' : quest.completed ? 'completed' : ''}`}
          >
            <div className="quest-info">
              <div className="quest-title">{quest.title}</div>
              <div className="quest-desc">{quest.description}</div>
              <div className="quest-progress-bar">
                <div 
                  className="quest-progress-fill" 
                  style={{ width: `${(quest.progress / quest.target) * 100}%` }} 
                />
              </div>
              <div className="quest-progress-text">
                {quest.progress}/{quest.target}
              </div>
            </div>
            <div className="quest-reward">
              <span className="reward gold">+{quest.reward.gold} 金币</span>
              <span className="reward xp">+{quest.reward.xp} XP</span>
            </div>
            <button
              type="button"
              className="claim-btn"
              disabled={!quest.completed || quest.claimed}
              onClick={() => onClaim(quest.id)}
            >
              {quest.claimed ? '已领取' : quest.completed ? '领取' : '进行中'}
            </button>
          </div>
        ))}
      </div>
      
      {allClaimed && (
        <div className="quests-complete-msg">
          今日岛课已全部完成，明天再来吧！
        </div>
      )}
    </div>
  )
}
