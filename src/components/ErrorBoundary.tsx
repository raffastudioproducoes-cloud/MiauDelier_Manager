import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logError } from '../lib/logger'
import { Button } from './ui/Button'
import { Card } from './ui/Card'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Registra falha de renderização no logger do sistema
    logError(
      'react_error_boundary',
      `Erro de interface: ${error.message}`,
      { componentStack: errorInfo.componentStack },
      error.stack,
    )
  }

  private handleTentarNovamente = () => {
    this.setState({ hasError: false, error: undefined })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] w-full items-center justify-center p-6">
          <Card className="flex max-w-lg flex-col gap-4 border-error/30 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error">
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-on-surface">Ops! Algo falhou nesta tela.</h2>
            <p className="text-sm text-on-surface-variant">
              O evento de erro foi capturado e gravado com segurança nos logs do sistema sem expor dados sensíveis.
            </p>

            {this.state.error && (
              <pre className="max-h-32 overflow-auto rounded bg-surface-container-high p-3 text-left text-xs font-mono text-error">
                {this.state.error.message}
              </pre>
            )}

            <div className="flex justify-center gap-3 pt-2">
              <Button variante="primary" onClick={this.handleTentarNovamente}>
                Recarregar Aplicação
              </Button>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
