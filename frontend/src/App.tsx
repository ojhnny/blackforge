import { EvidencePanel } from './components/EvidencePanel'
import { EvaluationView } from './components/EvaluationView'
import { FailedRun } from './components/FailedRun'
import { FindingDetail } from './components/FindingDetail'
import { FindingsList } from './components/FindingsList'
import { Header } from './components/Header'
import { PatchPanel } from './components/PatchPanel'
import { RunConfig } from './components/RunConfig'
import { RunSummary } from './components/RunSummary'
import { TerminalPanel } from './components/TerminalPanel'
import { VerificationPanel } from './components/VerificationPanel'
import { Workflow } from './components/Workflow'
import { useAnalysisRun } from './hooks/useAnalysisRun'

export default function App() {
  const {
    state,
    repos,
    selectedRepo,
    selectedFinding,
    durationLabel,
    updateConfig,
    toggleCategory,
    selectFinding,
    selectStage,
    setTerminalOpen,
    setView,
    startRun,
    reset,
  } = useAnalysisRun()

  return (
    <div className="app-shell">
      <Header
        projectName={selectedRepo.path}
        status={state.status}
        runId={state.runId}
        startedAt={state.startedAt}
        completedAt={state.completedAt}
        now={state.now}
        view={state.view}
        dataSource={state.dataSource}
        onViewChange={setView}
      />

      <main className="mx-auto max-w-[1400px] space-y-3 px-4 py-3 sm:px-5">
        {state.view === 'evaluation' ? (
          <EvaluationView
            metrics={state.metrics}
            comparisons={state.comparisons}
            hasCompletedRun={state.status === 'completed'}
            dataSource={state.dataSource}
          />
        ) : (
          <>
            <RunConfig
              repos={repos}
              config={state.config}
              isRunning={state.status === 'running'}
              progressMessage={state.progressMessage}
              onChange={updateConfig}
              onToggleCategory={toggleCategory}
              onStart={startRun}
              onReset={reset}
            />

            {state.error && (
              <FailedRun
                error={state.error}
                runId={state.runId}
                onRetry={startRun}
                onViewLogs={() => setTerminalOpen(true)}
              />
            )}

            <RunSummary
              summary={state.summary}
              visible={state.reveal.summary}
              durationLabel={
                state.startedAt ? durationLabel : '—'
              }
            />

            <div className="grid gap-3 xl:grid-cols-[240px_minmax(0,1fr)]">
              <div className="xl:sticky xl:top-14 xl:self-start">
                <Workflow
                  stages={state.workflow}
                  selectedStageId={state.selectedStageId}
                  onSelect={selectStage}
                />
              </div>

              <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
                <FindingsList
                  findings={state.findings}
                  selectedId={state.selectedFindingId}
                  visible={state.reveal.findings}
                  testsExecuted={state.summary?.tests_executed ?? null}
                  onSelect={selectFinding}
                />
                <FindingDetail
                  finding={selectedFinding}
                  patchResult={state.patchResult}
                  visible={state.reveal.findings}
                />
              </div>
            </div>

            <EvidencePanel
              finding={selectedFinding}
              referee={state.referee}
              patch={state.patch}
              patchResult={state.patchResult}
              activityDiscoveryModel={state.activity?.discovery_model ?? null}
              visible={state.reveal.evidence}
            />

            <div className="grid gap-3 lg:grid-cols-2">
              <PatchPanel
                patch={state.patch}
                patchResult={state.patchResult}
                visible={state.reveal.patch}
              />
              <VerificationPanel
                referee={state.referee}
                patchResult={state.patchResult}
                visible={state.reveal.verification}
              />
            </div>

            <TerminalPanel
              lines={state.terminalLines}
              open={state.terminalOpen}
              onToggle={setTerminalOpen}
            />
          </>
        )}
      </main>
    </div>
  )
}
