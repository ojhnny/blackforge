import { AgentTimeline } from './components/AgentTimeline'
import { DiffViewer } from './components/DiffViewer'
import { FindingPanel } from './components/FindingPanel'
import { ForgeConsole } from './components/ForgeConsole'
import { Header } from './components/Header'
import { MetricsPanel } from './components/MetricsPanel'
import { TerminalPanel } from './components/TerminalPanel'
import { TestViewer } from './components/TestViewer'
import { VerificationPanel } from './components/VerificationPanel'
import { useForgeRun } from './hooks/useForgeRun'
import type { RunPhase } from './types'

const PHASE_COPY: Record<RunPhase, string> = {
  idle: 'Ready to forge',
  ingesting: 'Ingesting target repo',
  breaking: 'Break phase in progress',
  reproducing: 'Referee reproducing failure',
  fixing: 'Fix phase in progress',
  proving: 'Prove phase in progress',
  complete: 'Forge run complete',
}

export default function App() {
  const { state, repos, selectRepo, startRun, reset } = useForgeRun()

  return (
    <div className="relative min-h-screen">
      <Header phase={state.phase} isRunning={state.isRunning} />

      <main className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 sm:px-6 sm:py-6">
        <ForgeConsole
          repos={repos}
          selectedRepoId={state.selectedRepoId}
          isRunning={state.isRunning}
          phaseLabel={PHASE_COPY[state.phase]}
          onSelectRepo={selectRepo}
          onStart={startRun}
          onReset={reset}
        />

        <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="xl:sticky xl:top-4 xl:self-start">
            <AgentTimeline steps={state.timeline} />
          </div>

          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <FindingPanel
                finding={state.finding}
                visible={state.reveal.finding}
              />
              <TestViewer
                code={state.finding?.generated_test ?? null}
                visible={state.reveal.test}
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <TerminalPanel
                lines={state.terminalLines}
                visible={state.reveal.terminal || state.terminalLines.length > 1}
              />
              <DiffViewer patch={state.patch} visible={state.reveal.diff} />
            </div>

            <VerificationPanel
              referee={state.referee}
              patchResult={state.patchResult}
              visible={state.reveal.verification}
            />

            <MetricsPanel
              metrics={state.metrics}
              visible={state.reveal.metrics}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
