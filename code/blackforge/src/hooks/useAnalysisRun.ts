import { useCallback, useEffect, useRef, useState } from 'react'
import {
  INITIAL_WORKFLOW,
  MOCK_ACTIVITY,
  MOCK_FINDINGS,
  MOCK_METRICS,
  MOCK_PATCH,
  MOCK_PATCH_RESULT,
  MOCK_REFEREE,
  MOCK_SUMMARY,
  TARGET_REPOS,
  TERMINAL_SEQUENCE,
} from '../data/mock'
import type {
  AnalysisState,
  BugCategory,
  Finding,
  RevealState,
  RunConfig,
  WorkflowStage,
  WorkflowStageId,
} from '../types'

const EMPTY_REVEAL: RevealState = {
  summary: false,
  findings: false,
  evidence: false,
  patch: false,
  verification: false,
  metrics: false,
}

function cloneWorkflow(): WorkflowStage[] {
  return INITIAL_WORKFLOW.map((stage) => ({
    ...stage,
    status: 'pending',
    durationMs: null,
  }))
}

function makeRunId(): string {
  return `run_${Math.random().toString(16).slice(2, 8)}`
}

function defaultConfig(repoId = TARGET_REPOS[0].id): RunConfig {
  const repo = TARGET_REPOS.find((item) => item.id === repoId) ?? TARGET_REPOS[0]
  return {
    repoId: repo.id,
    branch: repo.defaultBranch,
    commit: repo.commit,
    mode: 'full',
    categories: [...repo.categories],
    environment: 'docker_python_312',
  }
}

function finalizeFindings(): Finding[] {
  return MOCK_FINDINGS.map((finding, index) => {
    if (index === 0) {
      return { ...finding, verification_state: 'patched' }
    }
    if (index === 1) {
      return { ...finding, verification_state: 'verified' }
    }
    return { ...finding, verification_state: 'not_reproduced' }
  })
}

function createInitialState(repoId = TARGET_REPOS[0].id): AnalysisState {
  return {
    status: 'idle',
    runId: null,
    config: defaultConfig(repoId),
    workflow: cloneWorkflow(),
    reveal: { ...EMPTY_REVEAL },
    findings: [],
    selectedFindingId: null,
    referee: null,
    patch: null,
    patchResult: null,
    summary: null,
    metrics: null,
    activity: null,
    terminalLines: [],
    terminalOpen: false,
    startedAt: null,
    completedAt: null,
    now: Date.now(),
  }
}

function applyReveal(id: WorkflowStageId, reveal: RevealState): RevealState {
  const next = { ...reveal }
  switch (id) {
    case 'analyze':
      next.summary = true
      break
    case 'discover':
      next.findings = true
      break
    case 'reproduce':
      next.evidence = true
      break
    case 'patch':
      next.patch = true
      break
    case 'verify':
      next.verification = true
      next.metrics = true
      break
  }
  return next
}

export function useAnalysisRun() {
  const [state, setState] = useState<AnalysisState>(() => createInitialState())
  const timersRef = useRef<number[]>([])
  const runTokenRef = useRef(0)

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  useEffect(() => {
    if (state.status !== 'running') return
    const id = window.setInterval(() => {
      setState((prev) => ({ ...prev, now: Date.now() }))
    }, 250)
    return () => window.clearInterval(id)
  }, [state.status])

  const updateConfig = useCallback(
    (partial: Partial<RunConfig>) => {
      if (state.status === 'running') return
      setState((prev) => {
        const nextConfig = { ...prev.config, ...partial }
        if (partial.repoId) {
          const repo =
            TARGET_REPOS.find((item) => item.id === partial.repoId) ??
            TARGET_REPOS[0]
          nextConfig.branch = repo.defaultBranch
          nextConfig.commit = repo.commit
          nextConfig.categories = [...repo.categories]
        }
        return {
          ...createInitialState(nextConfig.repoId),
          config: nextConfig,
        }
      })
    },
    [state.status],
  )

  const toggleCategory = useCallback(
    (category: BugCategory) => {
      if (state.status === 'running') return
      setState((prev) => {
        const has = prev.config.categories.includes(category)
        const categories = has
          ? prev.config.categories.filter((item) => item !== category)
          : [...prev.config.categories, category]
        return {
          ...prev,
          config: {
            ...prev.config,
            categories: categories.length ? categories : prev.config.categories,
          },
        }
      })
    },
    [state.status],
  )

  const selectFinding = useCallback((findingId: string) => {
    setState((prev) => ({ ...prev, selectedFindingId: findingId }))
  }, [])

  const setTerminalOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, terminalOpen: open }))
  }, [])

  const reset = useCallback(() => {
    clearTimers()
    runTokenRef.current += 1
    setState((prev) => createInitialState(prev.config.repoId))
  }, [clearTimers])

  const startRun = useCallback(() => {
    clearTimers()
    const token = ++runTokenRef.current
    const workflow = cloneWorkflow()
    const runId = makeRunId()

    setState((prev) => ({
      ...createInitialState(prev.config.repoId),
      config: prev.config,
      status: 'running',
      runId,
      workflow,
      startedAt: Date.now(),
      now: Date.now(),
      terminalOpen: false,
      terminalLines: ['blackforge analyze --evidence-required'],
      activity: {
        ...MOCK_ACTIVITY,
        analysis_mode: prev.config.mode,
        verification_environment:
          prev.config.environment === 'docker_python_312'
            ? 'Docker / Python 3.12'
            : 'Docker / Python 3.11',
      },
      summary: {
        findings: 0,
        verified: 0,
        rejected: 0,
        patches_attempted: 0,
        patches_accepted: 0,
        regressions_introduced: 0,
        tests_executed: 0,
        duration_label: '0s',
      },
      reveal: { ...EMPTY_REVEAL, summary: true },
    }))

    let elapsed = 0
    workflow.forEach((stage, index) => {
      elapsed += stage.delayMs

      const activateId = window.setTimeout(() => {
        if (runTokenRef.current !== token) return
        setState((prev) => ({
          ...prev,
          workflow: prev.workflow.map((item, i) => {
            if (i === index) return { ...item, status: 'active' }
            if (i < index) return { ...item, status: 'done' }
            return item
          }),
        }))
      }, elapsed - Math.min(280, stage.delayMs * 0.3))
      timersRef.current.push(activateId)

      const completeId = window.setTimeout(() => {
        if (runTokenRef.current !== token) return
        const terminalExtra =
          TERMINAL_SEQUENCE.find((entry) => entry.afterStage === stage.id)
            ?.lines ?? []

        setState((prev) => {
          const reveal = applyReveal(stage.id, prev.reveal)
          const nextWorkflow = prev.workflow.map((item, i) =>
            i === index
              ? { ...item, status: 'done' as const, durationMs: stage.delayMs }
              : item,
          )
          const isLast = index === workflow.length - 1

          let findings = prev.findings
          let selectedFindingId = prev.selectedFindingId
          let referee = prev.referee
          let patch = prev.patch
          let patchResult = prev.patchResult
          let summary = prev.summary
          let metrics = prev.metrics

          if (stage.id === 'discover') {
            findings = MOCK_FINDINGS.map((finding) => ({
              ...finding,
              verification_state: 'pending' as const,
            }))
            selectedFindingId = findings[0]?.id ?? null
            summary = {
              findings: 4,
              verified: 0,
              rejected: 0,
              patches_attempted: 0,
              patches_accepted: 0,
              regressions_introduced: 0,
              tests_executed: 4,
              duration_label: formatDuration(
                Date.now() - (prev.startedAt ?? Date.now()),
              ),
            }
          }

          if (stage.id === 'reproduce') {
            findings = MOCK_FINDINGS.map((finding, i) => ({
              ...finding,
              verification_state:
                i < 2 ? ('verified' as const) : ('not_reproduced' as const),
            }))
            referee = MOCK_REFEREE
            summary = {
              findings: 4,
              verified: 2,
              rejected: 2,
              patches_attempted: 0,
              patches_accepted: 0,
              regressions_introduced: 0,
              tests_executed: 18,
              duration_label: formatDuration(
                Date.now() - (prev.startedAt ?? Date.now()),
              ),
            }
          }

          if (stage.id === 'patch') {
            patch = MOCK_PATCH
            summary = {
              findings: 4,
              verified: 2,
              rejected: 2,
              patches_attempted: 2,
              patches_accepted: 0,
              regressions_introduced: 0,
              tests_executed: 22,
              duration_label: formatDuration(
                Date.now() - (prev.startedAt ?? Date.now()),
              ),
            }
          }

          if (stage.id === 'verify') {
            findings = finalizeFindings()
            patchResult = MOCK_PATCH_RESULT
            metrics = MOCK_METRICS
            summary = {
              ...MOCK_SUMMARY,
              duration_label: formatDuration(
                Date.now() - (prev.startedAt ?? Date.now()),
              ),
            }
          }

          return {
            ...prev,
            status: isLast ? 'completed' : 'running',
            workflow: nextWorkflow,
            reveal,
            findings,
            selectedFindingId,
            referee,
            patch,
            patchResult,
            summary,
            metrics,
            terminalLines: [...prev.terminalLines, ...terminalExtra],
            completedAt: isLast ? Date.now() : prev.completedAt,
            now: Date.now(),
          }
        })
      }, elapsed)
      timersRef.current.push(completeId)
    })
  }, [clearTimers])

  const selectedRepo =
    TARGET_REPOS.find((repo) => repo.id === state.config.repoId) ??
    TARGET_REPOS[0]

  const selectedFinding =
    state.findings.find((finding) => finding.id === state.selectedFindingId) ??
    null

  return {
    state,
    repos: TARGET_REPOS,
    selectedRepo,
    selectedFinding,
    updateConfig,
    toggleCategory,
    selectFinding,
    setTerminalOpen,
    startRun,
    reset,
  }
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}
