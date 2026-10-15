import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ENVIRONMENTS,
  INITIAL_WORKFLOW,
  MOCK_ACTIVITY,
  MOCK_COMPARISONS,
  MOCK_FINDINGS,
  MOCK_METRICS,
  MOCK_PATCH,
  MOCK_PATCH_RESULT,
  MOCK_REFEREE,
  MOCK_SUMMARY,
  STAGE_PROGRESS,
  TARGET_REPOS,
  TERMINAL_SEQUENCE,
} from '../data/mock'
import {
  EVENT_TYPES,
  api,
  toFinding,
  toMetrics,
  toPatch,
  toPatchResult,
  toRunStatus,
  toTargetRepo,
  type ApiEvent,
  type ApiFindingDetail,
  type ApiHealth,
  type ApiRunDetail,
} from '../lib/api'
import { formatElapsed } from '../lib/format'
import type {
  AnalysisState,
  AppView,
  BugCategory,
  DataSource,
  Finding,
  RevealState,
  RunConfig,
  TargetRepo,
  WorkflowStage,
  WorkflowStageId,
} from '../types'

const HEALTH_TIMEOUT_MS = 1500

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
    progressLabel: null,
  }))
}

function makeRunId(): string {
  return `run_${Math.random().toString(16).slice(2, 8)}`
}

function defaultConfig(
  repoId: string,
  repos: TargetRepo[] = TARGET_REPOS,
): RunConfig {
  const repo = repos.find((item) => item.id === repoId) ?? repos[0]
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
      return { ...finding, verification_state: 'patch_accepted' }
    }
    if (index === 1) {
      return { ...finding, verification_state: 'verified' }
    }
    return { ...finding, verification_state: 'not_reproduced' }
  })
}

function createInitialState(
  repoId = TARGET_REPOS[0].id,
  repos: TargetRepo[] = TARGET_REPOS,
  dataSource: DataSource = 'mock',
): AnalysisState {
  return {
    dataSource,
    status: 'idle',
    view: 'run',
    runId: null,
    config: defaultConfig(repoId, repos),
    workflow: cloneWorkflow(),
    selectedStageId: null,
    progressMessage: null,
    reveal: { ...EMPTY_REVEAL },
    findings: [],
    selectedFindingId: null,
    referee: null,
    patch: null,
    patchResult: null,
    summary: null,
    metrics: null,
    comparisons: dataSource === 'live' ? [] : MOCK_COMPARISONS,
    activity: null,
    error: null,
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

function selectionFor(
  details: ApiFindingDetail[],
  findingId: string | null,
): Pick<AnalysisState, 'referee' | 'patch' | 'patchResult'> {
  const detail = details.find((item) => item.finding.id === findingId)
  return {
    referee: detail?.referee ?? null,
    patch: detail?.patch ? toPatch(detail.patch) : null,
    patchResult: detail?.patch_result
      ? toPatchResult(detail.patch_result, detail.finding)
      : null,
  }
}

function applyRunDetail(prev: AnalysisState, detail: ApiRunDetail): AnalysisState {
  const { run } = detail
  const byId = new Map(run.stages.map((stage) => [stage.id, stage]))
  const workflow = prev.workflow.map((stage) => {
    const live = byId.get(stage.id)
    if (!live) return stage
    return {
      ...stage,
      status: live.status,
      durationMs: live.duration_ms,
      progressLabel: live.detail,
    }
  })
  const isDone = (id: WorkflowStageId) => byId.get(id)?.status === 'done'
  const active = run.stages.find((stage) => stage.status === 'active') ?? null
  const status = toRunStatus(run.status)

  const findings = detail.findings.map((item) => toFinding(item, run))
  const selectedFindingId =
    findings.find((finding) => finding.id === prev.selectedFindingId)?.id ??
    findings.find((finding) => finding.verification_state !== 'not_reproduced')?.id ??
    findings[0]?.id ??
    null

  const failedStage = run.stages.find((stage) => stage.status === 'failed')
  return {
    ...prev,
    status,
    runId: run.id,
    workflow,
    selectedStageId: active?.id ?? prev.selectedStageId,
    progressMessage: status === 'running' ? (active?.detail ?? 'Starting run') : null,
    reveal: {
      summary: true,
      findings: isDone('discover'),
      evidence: isDone('reproduce'),
      patch: isDone('patch'),
      verification: isDone('verify'),
      metrics: status === 'completed',
    },
    findings,
    selectedFindingId,
    ...selectionFor(detail.findings, selectedFindingId),
    summary: detail.summary,
    activity: prev.activity
      ? { ...prev.activity, patch_attempts: detail.summary.patches_attempted }
      : prev.activity,
    error:
      status === 'failed'
        ? {
            message: 'Run failed',
            detail: run.error ?? 'The backend reported a failure.',
            stage: failedStage?.id ?? 'analyze',
          }
        : null,
    startedAt: Date.parse(run.created_at),
    completedAt: run.completed_at ? Date.parse(run.completed_at) : null,
    now: Date.now(),
  }
}

export function useAnalysisRun() {
  const [state, setState] = useState<AnalysisState>(() => createInitialState())
  const [repos, setRepos] = useState<TargetRepo[]>(TARGET_REPOS)
  const timersRef = useRef<number[]>([])
  const runTokenRef = useRef(0)
  const streamRef = useRef<EventSource | null>(null)
  const healthRef = useRef<ApiHealth | null>(null)
  const liveDetailsRef = useRef<ApiFindingDetail[]>([])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
    streamRef.current?.close()
    streamRef.current = null
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  // Use the live backend when it answers; otherwise keep the mock simulation.
  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)
    let cancelled = false
    ;(async () => {
      try {
        healthRef.current = await api.health(controller.signal)
        const liveRepos = (await api.repos()).map(toTargetRepo)
        if (cancelled || liveRepos.length === 0) return
        setRepos(liveRepos)
        const docker = healthRef.current.docker_available
        setState((prev) => {
          if (prev.status === 'running') return prev
          const next = createInitialState(liveRepos[0].id, liveRepos, 'live')
          return {
            ...next,
            view: prev.view,
            config: docker ? next.config : { ...next.config, environment: 'local_python' },
          }
        })
      } catch {
        // Backend not running: stay on mock data.
      } finally {
        window.clearTimeout(timeout)
      }
    })()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (state.status !== 'running') return
    const id = window.setInterval(() => {
      setState((prev) => ({ ...prev, now: Date.now() }))
    }, 200)
    return () => window.clearInterval(id)
  }, [state.status])

  const updateConfig = useCallback(
    (partial: Partial<RunConfig>) => {
      if (state.status === 'running') return
      setState((prev) => {
        const nextConfig = { ...prev.config, ...partial }
        if (partial.repoId) {
          const repo =
            repos.find((item) => item.id === partial.repoId) ?? repos[0]
          nextConfig.branch = repo.defaultBranch
          nextConfig.commit = repo.commit
          nextConfig.categories = [...repo.categories]
        }
        return {
          ...createInitialState(nextConfig.repoId, repos, prev.dataSource),
          view: prev.view,
          config: nextConfig,
        }
      })
    },
    [state.status, repos],
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
    setState((prev) =>
      prev.dataSource === 'live' && prev.runId
        ? {
            ...prev,
            selectedFindingId: findingId,
            ...selectionFor(liveDetailsRef.current, findingId),
          }
        : { ...prev, selectedFindingId: findingId },
    )
  }, [])

  const selectStage = useCallback((stageId: WorkflowStageId) => {
    setState((prev) => ({
      ...prev,
      selectedStageId: prev.selectedStageId === stageId ? null : stageId,
    }))
  }, [])

  const setTerminalOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, terminalOpen: open }))
  }, [])

  const setView = useCallback((view: AppView) => {
    setState((prev) => ({ ...prev, view }))
  }, [])

  const reset = useCallback(() => {
    clearTimers()
    runTokenRef.current += 1
    liveDetailsRef.current = []
    if (state.dataSource === 'live' && state.status === 'running' && state.runId) {
      api.cancelRun(state.runId).catch(() => undefined)
    }
    setState((prev) => ({
      ...createInitialState(prev.config.repoId, repos, prev.dataSource),
      view: prev.view,
      config: prev.config,
    }))
  }, [clearTimers, repos, state.dataSource, state.status, state.runId])

  const startLiveRun = useCallback(async () => {
    clearTimers()
    const token = ++runTokenRef.current
    liveDetailsRef.current = []
    const health = healthRef.current
    setState((prev) => ({
      ...createInitialState(prev.config.repoId, repos, 'live'),
      view: 'run',
      config: prev.config,
      status: 'running',
      progressMessage: 'Starting run',
      startedAt: Date.now(),
      now: Date.now(),
      reveal: { ...EMPTY_REVEAL, summary: true },
      activity: {
        discovery_model: 'Seeded manifest (discovery agent planned)',
        verification_environment:
          prev.config.environment !== 'local_python' && health?.docker_available
            ? 'Docker'
            : 'Local pytest',
        patch_attempts: 0,
        analysis_mode: prev.config.mode,
      },
    }))

    let run
    try {
      run = await api.startRun({
        repo_id: state.config.repoId,
        mode: state.config.mode,
        categories: state.config.categories,
        prefer_docker: state.config.environment !== 'local_python',
      })
    } catch (error) {
      if (runTokenRef.current !== token) return
      setState((prev) => ({
        ...prev,
        status: 'failed',
        progressMessage: null,
        completedAt: Date.now(),
        error: {
          message: 'Could not start the run',
          detail: error instanceof Error ? error.message : String(error),
          stage: 'analyze',
        },
      }))
      return
    }
    if (runTokenRef.current !== token) return
    const runId = run.id
    setState((prev) => ({ ...prev, runId }))

    // Coalesce refreshes: events can arrive faster than GET /runs/{id} returns.
    let inFlight = false
    let again = false
    let wantFinal = false
    const refresh = async (final = false): Promise<void> => {
      wantFinal ||= final
      if (inFlight) {
        again = true
        return
      }
      inFlight = true
      again = false
      final = wantFinal
      try {
        const detail = await api.run(runId)
        if (runTokenRef.current !== token) return
        liveDetailsRef.current = detail.findings
        setState((prev) => applyRunDetail(prev, detail))
        if (final) {
          const metrics = await api.metrics(detail.run.repo_id ?? undefined)
          if (runTokenRef.current !== token) return
          setState((prev) => ({ ...prev, metrics: toMetrics(metrics) }))
        }
      } catch {
        // A later event or the final refresh will catch up.
      } finally {
        inFlight = false
        if (again) void refresh()
      }
    }

    const source = api.events(runId)
    streamRef.current = source
    for (const type of EVENT_TYPES) {
      source.addEventListener(type, (message) => {
        if (runTokenRef.current !== token) return
        const event = JSON.parse((message as MessageEvent<string>).data) as ApiEvent
        if (event.type === 'log') {
          setState((prev) => ({
            ...prev,
            terminalLines: [...prev.terminalLines, event.message],
          }))
          return
        }
        if (
          event.type === 'run_completed' ||
          event.type === 'run_failed' ||
          event.type === 'run_cancelled'
        ) {
          source.close()
          streamRef.current = null
          void refresh(true)
          return
        }
        void refresh()
      })
    }
  }, [clearTimers, repos, state.config])

  const startMockRun = useCallback(() => {
    clearTimers()
    const token = ++runTokenRef.current
    const workflow = cloneWorkflow()
    const runId = makeRunId()
    const repoList = TARGET_REPOS

    setState((prev) => ({
      ...createInitialState(prev.config.repoId, repoList),
      view: 'run',
      config: prev.config,
      status: 'running',
      runId,
      workflow,
      selectedStageId: 'analyze',
      progressMessage: 'Analyzing repository',
      startedAt: Date.now(),
      now: Date.now(),
      terminalOpen: false,
      terminalLines: [],
      activity: {
        ...MOCK_ACTIVITY,
        analysis_mode: prev.config.mode,
        verification_environment:
          ENVIRONMENTS.find((env) => env.id === prev.config.environment)?.label ??
          'Docker / Python 3.12',
      },
      summary: {
        findings: 0,
        verified: 0,
        rejected: 0,
        patches_attempted: 0,
        patches_accepted: 0,
        regressions_introduced: 0,
        tests_executed: 0,
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
          selectedStageId: stage.id,
          progressMessage: STAGE_PROGRESS[stage.id] ?? stage.detail,
          workflow: prev.workflow.map((item, i) => {
            if (i === index) {
              return {
                ...item,
                status: 'active',
                progressLabel: STAGE_PROGRESS[stage.id] ?? item.detail,
              }
            }
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
              ? {
                  ...item,
                  status: 'done' as const,
                  durationMs: stage.delayMs,
                  progressLabel: STAGE_PROGRESS[stage.id] ?? item.detail,
                }
              : item,
          )
          const isLast = index === workflow.length - 1
          const now = Date.now()

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
              verification_state: 'pending_verification' as const,
            }))
            selectedFindingId = findings[0]?.id ?? null
            summary = {
              findings: findings.length,
              verified: 0,
              rejected: 0,
              patches_attempted: 0,
              patches_accepted: 0,
              regressions_introduced: 0,
              tests_executed: findings.length,
            }
          }

          if (stage.id === 'reproduce') {
            findings = MOCK_FINDINGS.map((finding, i) => ({
              ...finding,
              verification_state:
                i < 2
                  ? ('verified' as const)
                  : ('not_reproduced' as const),
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
            }
          }

          if (stage.id === 'patch') {
            findings = prev.findings.map((finding) =>
              finding.id === 'BF-1042'
                ? { ...finding, verification_state: 'verified' as const }
                : finding,
            )
            patch = MOCK_PATCH
            summary = {
              findings: 4,
              verified: 2,
              rejected: 2,
              patches_attempted: 2,
              patches_accepted: 0,
              regressions_introduced: 0,
              tests_executed: 22,
            }
          }

          if (stage.id === 'verify') {
            findings = finalizeFindings()
            patchResult = MOCK_PATCH_RESULT
            metrics = MOCK_METRICS
            summary = { ...MOCK_SUMMARY }
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
            progressMessage: isLast ? null : prev.progressMessage,
            terminalLines: [...prev.terminalLines, ...terminalExtra],
            completedAt: isLast ? now : prev.completedAt,
            now,
          }
        })
      }, elapsed)
      timersRef.current.push(completeId)
    })
  }, [clearTimers])

  const startRun = useCallback(() => {
    if (state.dataSource === 'live') void startLiveRun()
    else startMockRun()
  }, [state.dataSource, startLiveRun, startMockRun])

  const selectedRepo =
    repos.find((repo) => repo.id === state.config.repoId) ?? repos[0]

  const selectedFinding =
    state.findings.find((finding) => finding.id === state.selectedFindingId) ??
    null

  const selectedStage =
    state.workflow.find((stage) => stage.id === state.selectedStageId) ?? null

  const durationLabel = formatElapsed(
    state.startedAt,
    state.completedAt,
    state.now,
  )

  return {
    state,
    repos,
    selectedRepo,
    selectedFinding,
    selectedStage,
    durationLabel,
    updateConfig,
    toggleCategory,
    selectFinding,
    selectStage,
    setTerminalOpen,
    setView,
    startRun,
    reset,
  }
}
