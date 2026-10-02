import { Component, ErrorInfo, ReactNode } from 'react';
import { sendTelemetry } from '../lib/api';

const RELOAD_FLAG = 'memorabilia_chunk_reload';

/**
 * A screen's code failed to download. After a deploy the old hashed file
 * names stop existing, so a session that was open across the deploy hits
 * this the first time it opens a screen it had not loaded yet.
 */
function isChunkLoadError(error: Error): boolean {
  return /dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError/i.test(
    `${error.name} ${error.message}`,
  );
}

function reloadedRecently(): boolean {
  try {
    const at = Number(sessionStorage.getItem(RELOAD_FLAG) ?? 0);
    return Date.now() - at < 30_000;
  } catch {
    return true; // No storage: never risk a reload loop.
  }
}

interface State {
  error: Error | null;
}

/**
 * Last line of defence for the whole app. Without it, any render error — or a
 * lazy screen whose chunk fails to load — unmounts everything and leaves a
 * blank Mini App.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    sendTelemetry({
      type: 'error',
      source: isChunkLoadError(error) ? 'chunk-load' : 'render',
      message: error.message || 'Render error',
      metadata: { stack: info.componentStack?.slice(0, 500) },
    });

    // A stale build fixes itself with one reload, which fetches the new
    // index.html and its chunk names. Only once, so a real outage does not
    // turn into a reload loop.
    if (isChunkLoadError(error) && !reloadedRecently()) {
      try {
        sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
      } catch { /* reload anyway */ }
      window.location.reload();
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center" style={{ background: '#0b0f17', color: '#f3ead7' }}>
        <div className="text-5xl">🏛️</div>
        <h1 className="text-xl font-bold">The gallery lost its way</h1>
        <p className="max-w-xs text-sm opacity-70">
          Something failed to load. Your progress is saved — reopening the museum usually fixes it.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl px-5 py-3 text-sm font-bold"
          style={{ background: '#c9a24a', color: '#1a1408' }}
        >
          Reopen the museum
        </button>
      </div>
    );
  }
}
