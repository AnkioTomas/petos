/**
 * 外出任务数据（economy.md §5）
 * Demo 时长 1-4 min；正式小时级同比
 */

import type { JobDef } from './types'

export const WORK_JOBS: JobDef[] = [
  {
    id: 'work_fishing_net',
    name: '晒渔网',
    kind: 'work',
    duration: 60 * 1000, // 1 min
    rewards: { gold: 28, xp: 6 },
    requirements: { stage: 'baby' },
    description: '帮渔夫整理渔网，简单轻松',
  },
  {
    id: 'work_shelf',
    name: '整理货架',
    kind: 'work',
    duration: 120 * 1000, // 2 min
    rewards: { gold: 48, xp: 10 },
    requirements: { stage: 'teen' },
    description: '在便利店整理货品',
  },
  {
    id: 'work_lighthouse',
    name: '灯塔值班',
    kind: 'work',
    duration: 180 * 1000, // 3 min
    rewards: { gold: 72, xp: 14 },
    requirements: { stage: 'youth' },
    description: '守望灯塔，责任重大',
  },
  {
    id: 'work_delivery',
    name: '送货小助手',
    kind: 'work',
    duration: 90 * 1000,
    rewards: { gold: 38, xp: 8 },
    requirements: { stage: 'baby' },
    description: '帮忙递送小包裹',
  },
  {
    id: 'work_garden',
    name: '花园帮工',
    kind: 'work',
    duration: 100 * 1000,
    rewards: { gold: 42, xp: 9 },
    requirements: { stage: 'teen' },
    description: '修剪花草，打理庭院',
  },
  {
    id: 'work_kitchen',
    name: '厨房小帮手',
    kind: 'work',
    duration: 150 * 1000,
    rewards: { gold: 58, xp: 12 },
    requirements: { stage: 'teen' },
    description: '在餐厅帮忙洗碗端菜',
  },
  {
    id: 'work_mail',
    name: '邮递员助理',
    kind: 'work',
    duration: 120 * 1000,
    rewards: { gold: 52, xp: 11 },
    requirements: { stage: 'teen' },
    description: '帮忙分拣和投递信件',
  },
  {
    id: 'work_library',
    name: '图书整理',
    kind: 'work',
    duration: 140 * 1000,
    rewards: { gold: 55, xp: 11, attrs: { intel: 1 } },
    requirements: { stage: 'youth' },
    description: '在图书馆整理书籍',
  },
]

export const STUDY_COURSES: JobDef[] = [
  {
    id: 'study_language',
    name: '语文感',
    kind: 'study',
    duration: 120 * 1000, // 2 min
    rewards: { xp: 12, gold: 8, attrs: { intel: 3, charm: 1 } },
    description: '学习阅读和表达',
  },
  {
    id: 'study_physical',
    name: '体锻',
    kind: 'study',
    duration: 120 * 1000,
    rewards: { xp: 12, gold: 8, attrs: { strong: 3 } },
    description: '强身健体',
  },
  {
    id: 'study_math',
    name: '算数课',
    kind: 'study',
    duration: 120 * 1000,
    rewards: { xp: 12, gold: 8, attrs: { intel: 3 } },
    description: '数字和逻辑思维',
  },
  {
    id: 'study_art',
    name: '美术课',
    kind: 'study',
    duration: 100 * 1000,
    rewards: { xp: 10, gold: 6, attrs: { charm: 2, intel: 1 } },
    description: '绘画和审美培养',
  },
  {
    id: 'study_music',
    name: '音乐课',
    kind: 'study',
    duration: 100 * 1000,
    rewards: { xp: 10, gold: 6, attrs: { charm: 3 } },
    description: '节奏和乐感训练',
  },
  {
    id: 'study_nature',
    name: '自然观察',
    kind: 'study',
    duration: 90 * 1000,
    rewards: { xp: 8, gold: 5, attrs: { intel: 2 } },
    description: '认识花草树木和小动物',
  },
]

export const TRIP_DESTINATIONS: JobDef[] = [
  {
    id: 'trip_beach',
    name: '邻湾沙滩',
    kind: 'trip',
    duration: 120 * 1000, // 2 min
    rewards: { mood: 18, gold: 12, xp: 8 },
    description: '捡贝壳，踏浪花',
  },
  {
    id: 'trip_lighthouse',
    name: '灯塔岬',
    kind: 'trip',
    duration: 180 * 1000, // 3 min
    rewards: { mood: 22, gold: 16, xp: 10 },
    description: '眺望远海，感受海风',
  },
  {
    id: 'trip_market',
    name: '远港集市',
    kind: 'trip',
    duration: 240 * 1000, // 4 min
    rewards: { mood: 26, gold: 22, xp: 14 },
    description: '热闹的集市，好多新鲜事物',
  },
  {
    id: 'trip_forest',
    name: '小树林',
    kind: 'trip',
    duration: 100 * 1000,
    rewards: { mood: 16, gold: 10, xp: 7 },
    description: '在树荫下乘凉',
  },
  {
    id: 'trip_hill',
    name: '瞭望山丘',
    kind: 'trip',
    duration: 150 * 1000,
    rewards: { mood: 20, gold: 14, xp: 9 },
    description: '登高望远，心旷神怡',
  },
  {
    id: 'trip_lake',
    name: '星月湖',
    kind: 'trip',
    duration: 130 * 1000,
    rewards: { mood: 19, gold: 13, xp: 8 },
    description: '湖边散步，看鱼戏水',
  },
  {
    id: 'trip_garden',
    name: '花海公园',
    kind: 'trip',
    duration: 110 * 1000,
    rewards: { mood: 17, gold: 11, xp: 7 },
    description: '漫步花丛，闻香赏景',
  },
  {
    id: 'trip_bridge',
    name: '彩虹桥',
    kind: 'trip',
    duration: 90 * 1000,
    rewards: { mood: 15, gold: 9, xp: 6 },
    description: '横跨小河的彩色木桥',
  },
  {
    id: 'trip_windmill',
    name: '风车草原',
    kind: 'trip',
    duration: 160 * 1000,
    rewards: { mood: 21, gold: 15, xp: 10 },
    description: '大风车下的草地野餐',
  },
  {
    id: 'trip_pier',
    name: '码头栈道',
    kind: 'trip',
    duration: 100 * 1000,
    rewards: { mood: 16, gold: 10, xp: 7 },
    description: '看渔船往来',
  },
  {
    id: 'trip_cave',
    name: '萤光洞',
    kind: 'trip',
    duration: 200 * 1000,
    rewards: { mood: 24, gold: 18, xp: 12 },
    description: '神秘的发光洞穴',
  },
  {
    id: 'trip_ruins',
    name: '古塔遗迹',
    kind: 'trip',
    duration: 220 * 1000,
    rewards: { mood: 25, gold: 20, xp: 13 },
    description: '探索古老的石塔',
  },
]

export function getJobById(id: string): JobDef | undefined {
  return [...WORK_JOBS, ...STUDY_COURSES, ...TRIP_DESTINATIONS].find(j => j.id === id)
}

export function getJobsByKind(kind: 'work' | 'study' | 'trip'): JobDef[] {
  switch (kind) {
    case 'work': return WORK_JOBS
    case 'study': return STUDY_COURSES
    case 'trip': return TRIP_DESTINATIONS
  }
}
