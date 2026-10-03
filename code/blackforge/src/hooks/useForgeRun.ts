import { useCallback, useEffect, useRef, useState } from 'react'
import {
  INITIAL_TIMELINE,
  MOCK_FINDING,
  MOCK_METRICS,
  MOCK_PATCH,
  MOCK_PATCH_RESULT,
  MOCK_REFEREE,
  TARGET_REPOS,
  TERMINAL_SEQUENCE,
} from '../data/mock'
import type {
  ForgeRunState,
  RevealState,
  RunPhase,
  TimelineStep,
  TimelineStepId,
} from '../types'

const EMPTY_REVEAL: RevealState = {
  finding: false,
  test: false,
  terminal: false,
  diff: false,
  verification: false,
  metrics: false,
}

function phaseForStep(id: TimelineStepId): RunPhase {
  switch (id) {
    case 'ingest':
      return 'ingesting'
    case 'red_scan':
    case 'finding':
    case 'test_gen':
      return 'breaking'
    case 'referee_bug':
      return 'reproducing'
    case 'blue_patch':
      return 'fixing'
    case 'verify':
      return 'proving'
    case 'metrics':
      return 'complete'
  }
}

function applyReveal(id: TimelineStepId, reveal: RevealState): RevealState {
  const next = { ...reveal }
  switch (id) {
    case 'finding':
      next.finding = true
      break
    case 'test_gen':
      next.test = true
      next.terminal = true
      break
    case 'referee_bug':
      next.terminal = true
      break
    case 'blue_patch':
      next.diff = true
      break
    case 'verify':
      next.verification = true
      break
    case 'metrics':
      next.metrics = true
      break
  }
  return next
}

function cloneTimeline(): TimelineStep[] {
  return INITIAL_TIMELINE.map((step) => ({ ...step, status: 'pending' }))
}

function createInitialState(repoId = TARGET_REPOS[0].id): ForgeRunState {
  return {
    phase: 'idle',
    selectedRepoId: repoId,
    isRunning: false,
    timeline: cloneTimeline(),
    reveal: { ...EMPTY_REVEAL },
    finding: null,
    referee: null,
    patch: null,
    patchResult: null,
    metrics: null,
    terminalLines: [],
    startedAt: null,
    completedAt: null,
  }
}

export function useForgeRun() {
  const [state, setState] = useState<ForgeRunState>(() => createInitialState())
  const timersRef = useRef<number[]>([])
  const runTokenRef = useRef(0)

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  const selectRepo = useCallback(
    (repoId: string) => {
      if (state.isRunning) return
      setState(createInitialState(repoId))
    },
    [state.isRunning],
  )

  const reset = useCallback(() => {
    clearTimers()
    runTokenRef.current += 1
    setState((prev) => createInitialState(prev.selectedRepoId))
  }, [clearTimers])

  const startRun = useCallback(() => {
    clearTimers()
    const token = ++runTokenRef.current
    const timeline = cloneTimeline()
    setState((prev) => ({
      ...createInitialState(prev.selectedRepoId),
      isRunning: true,
      phase: 'ingesting',
      timeline,
      startedAt: Date.now(),
      terminalLines: ['$ blackforge run --evidence-required'],
    }))

    let elapsed = 0
    timeline.forEach((step, index) => {
      elapsed += step.delayMs

      const activateId = window.setTimeout(() => {
        if (runTokenRef.current !== token) return
        setState((prev) => ({
          ...prev,
          phase: phaseForStep(step.id),
          timeline: prev.timeline.map((item, i) => {
            if (i === index) return { ...item, status: 'active' }
            if (i < index) return { ...item, status: 'done' }
            return item
          }),
        }))
      }, elapsed - Math.min(320, step.delayMs * 0.35))
      timersRef.current.push(activateId)

      const completeId = window.setTimeout(() => {
        if (runTokenRef.current !== token) return

        const terminalExtra =
          TERMINAL_SEQUENCE.find((entry) => entry.afterStep === step.id)
            ?.lines ?? []

        setState((prev) => {
          const reveal = applyReveal(step.id, prev.reveal)
          const nextTimeline = prev.timeline.map((item, i) =>
            i === index ? { ...item, status: 'done' as const } : item,
          )
          const isLast = index === timeline.length - 1

          return {
            ...prev,
            phase: isLast ? 'complete' : phaseForStep(step.id),
            isRunning: !isLast,
            timeline: nextTimeline,
            reveal,
            finding: reveal.finding ? MOCK_FINDING : prev.finding,
            referee: step.id === 'referee_bug' ? MOCK_REFEREE : prev.referee,
            patch: reveal.diff ? MOCK_PATCH : prev.patch,
            patchResult: reveal.verification
              ? MOCK_PATCH_RESULT
              : prev.patchResult,
            metrics: reveal.metrics ? MOCK_METRICS : prev.metrics,
            terminalLines: [...prev.terminalLines, ...terminalExtra],
            completedAt: isLast ? Date.now() : prev.completedAt,
          }
        })
      }, elapsed)
      timersRef.current.push(completeId)
    })
  }, [clearTimers])

  return {
    state,
    repos: TARGET_REPOS,
    selectRepo,
    startRun,
    reset,
  }
}
