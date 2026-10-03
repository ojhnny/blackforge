import { EvidencePanel } from './components/EvidencePanel'
import { FindingDetail } from './components/FindingDetail'
import { FindingsList } from './components/FindingsList'
import { Header } from './components/Header'
import { MetricsPanel } from './components/MetricsPanel'
import { PatchPanel } from './components/PatchPanel'
import { RunConfig } from './components/RunConfig'
import { RunSummary } from './components/RunSummary'
import { SystemActivity } from './components/SystemActivity'
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
    updateConfig,
    toggleCategory,
    selectFinding,
    setTerminalOpen,
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
      />

      <main className="mx-auto max-w-[1440px] space-y-3 px-4 py-4 sm:px-5">
        <RunConfig
          repos={repos}
          config={state.config}
          isRunning={state.status === 'running'}
          onChange={updateConfig}
          onToggleCategory={toggleCategory}
          onStart={startRun}
          onReset={reset}
        />

        <RunSummary summary={state.summary} visible={state.reveal.summary} />

        <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
          <Workflow stages={state.workflow} />

          <div className="grid gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
            <FindingsList
              findings={state.findings}
              selectedId={state.selectedFindingId}
              visible={state.reveal.findings}
              onSelect={selectFinding}
            />
            <FindingDetail
              finding={selectedFinding}
              visible={state.reveal.findings}
            />
          </div>
        </div>

        <EvidencePanel
          finding={selectedFinding}
          referee={state.referee}
          patchResult={state.patchResult}
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

        <SystemActivity activity={state.activity} />

        <MetricsPanel
          metrics={state.metrics}
          visible={state.reveal.metrics}
        />
      </main>
    </div>
  )
}
