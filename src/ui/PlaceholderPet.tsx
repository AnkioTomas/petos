import type { CSSProperties } from 'react'

type Props = {
  pose: string
  dim?: boolean
  bounce?: boolean
  onPet?: () => void
}

/** 无素材包时的几何占位宠（非任何具体角色） */
export function PlaceholderPet({ pose, dim, bounce, onPet }: Props) {
  const sleeping = pose === 'sleep'
  const breathe = pose === 'idle' || pose === 'play'
  const style: CSSProperties = {
    opacity: dim || sleeping ? 0.75 : 1,
    transform: bounce ? 'scale(1.06)' : sleeping ? 'translateY(6px)' : undefined,
    transition: 'transform 0.25s ease, opacity 0.3s ease',
    cursor: 'pointer',
    userSelect: 'none',
  }

  return (
    <svg
      viewBox="0 0 200 200"
      width={220}
      height={220}
      style={style}
      onClick={onPet}
      className={breathe ? 'ph-breathe' : undefined}
      role="img"
      aria-label="占位宠物"
    >
      <defs>
        <radialGradient id="bodyGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffd6e7" />
          <stop offset="100%" stopColor="#f5a3c7" />
        </radialGradient>
      </defs>
      {/* ears */}
      <ellipse cx="60" cy="58" rx="22" ry="32" fill="url(#bodyGrad)" />
      <ellipse cx="140" cy="58" rx="22" ry="32" fill="url(#bodyGrad)" />
      {/* body */}
      <ellipse cx="100" cy="115" rx="70" ry="62" fill="url(#bodyGrad)" />
      {/* face */}
      {sleeping ? (
        <>
          <path d="M78 108 Q88 114 98 108" stroke="#5a4060" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M102 108 Q112 114 122 108" stroke="#5a4060" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="82" cy="108" r="6" fill="#3d2a45" />
          <circle cx="118" cy="108" r="6" fill="#3d2a45" />
          <circle cx="84" cy="106" r="2" fill="#fff" />
          <circle cx="120" cy="106" r="2" fill="#fff" />
        </>
      )}
      <ellipse cx="100" cy="124" rx="8" ry="5" fill="#e8789a" />
      {pose === 'eat' && (
        <text x="100" y="50" textAnchor="middle" fontSize="20">
          🍙
        </text>
      )}
      {pose === 'pet' && (
        <text x="160" y="70" textAnchor="middle" fontSize="18">
          💕
        </text>
      )}
    </svg>
  )
}
