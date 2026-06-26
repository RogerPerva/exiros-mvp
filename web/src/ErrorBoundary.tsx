import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Captura errores de render del árbol y muestra un fallback en vez de pantalla blanca
 * (QA-L02 / robustez). No reemplaza el manejo de errores de red (eso vive en api.ts).
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary capturó un error de render:', error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h1>Algo salió mal</h1>
          <p>Ocurrió un error inesperado. Recarga la página para continuar.</p>
          <button onClick={() => window.location.reload()}>Recargar</button>
        </div>
      );
    }
    return this.props.children;
  }
}
