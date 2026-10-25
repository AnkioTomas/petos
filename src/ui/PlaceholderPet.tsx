import type { CSSProperties } from 'react'
import type { DeskBehavior } from '../engine/desk'

type Props = {
  pose: string
  dim?: boolean
  bounce?: boolean
  deskBehavior?: DeskBehavior
}

/** 无素材包时的几何占位宠（非任何具体角色） */
export function PlaceholderPet({ pose, dim, bounce, deskBehavior = 'idle' }: Props) {
  const sleeping = pose === 'sleep' || pose === 'weak'
  const breathe = pose === 'idle' || pose === 'play'
  const isWalking = deskBehavior === 'walk_left' || deskBehavior === 'walk_right'
  const isJumping = deskBehavior === 'jump'
  const isHiding = deskBehavior === 'edge_hide_left' || deskBehavior === 'edge_hide_right'
  const isLifted = pose === 'lift'
  
  let transform = ''
  if (bounce) transform = 'scale(1.06)'
  else if (sleeping) transform = 'translateY(6px)'
  else if (isLifted) transform = 'translateY(-10px) rotate(5deg)'
  else if (isJumping) transform = 'translateY(-20px)'
  else if (isHiding) {
    transform = deskBehavior === 'edge_hide_left' 
      ? 'translateX(-60px) scaleX(-1)' 
      : 'translateX(60px)'
  }
  
  const style: CSSProperties = {
    opacity: dim || sleeping ? 0.75 : 1,
    transform: transform || undefined,
    transition: 'transform 0.25s ease, opacity 0.3s ease',
    userSelect: 'none',
  }

  const animClass = [
    breathe && !isWalking && !isJumping ? 'ph-breathe' : '',
    isWalking ? 'ph-walk' : '',
    isJumping ? 'ph-jump' : '',
  ].filter(Boolean).join(' ')

  return (
    <svg
      viewBox="0 0 200 200"
      width={220}
      height={220}
      style={style}
      className={animClass || undefined}
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
      {/* legs for walking */}
      {isWalking && (
        <>
          <ellipse cx="75" cy="165" rx="12" ry="8" fill="url(#bodyGrad)" className="ph-leg-left" />
          <ellipse cx="125" cy="165" rx="12" ry="8" fill="url(#bodyGrad)" className="ph-leg-right" />
        </>
      )}
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
      {isLifted && (
        <text x="100" y="50" textAnchor="middle" fontSize="16">
          ～
        </text>
      )}
      {pose === 'weak' && (
        <text x="130" y="80" textAnchor="middle" fontSize="14">
          💤
        </text>
      )}
    </svg>
  )
}
