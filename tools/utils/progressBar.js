const BAR_WIDTH = 20;

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function renderBar(processed, total) {
  const ratio = total > 0 ? processed / total : 1;
  const filled = Math.round(BAR_WIDTH * Math.min(1, ratio));
  const empty = BAR_WIDTH - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

function createProgress(total) {
  const state = {
    total,
    processed: 0,
    totalDurationMs: 0,
    cachedCount: 0,
  };

  function tick(durationMs, meta = {}) {
    state.processed += 1;
    state.totalDurationMs += durationMs;
    if (meta.cached) {
      state.cachedCount += 1;
    }

    const percent = state.total > 0 ? Math.round((state.processed / state.total) * 100) : 100;
    const avgMs = state.processed > 0 ? state.totalDurationMs / state.processed : 0;
    const remaining = Math.max(state.total - state.processed, 0);
    const etaMs = avgMs * remaining;
    const cachedLabel = meta.cached ? ' (cached)' : '';

    const line1 = `${renderBar(state.processed, state.total)} ${state.processed}/${state.total} chunks (${percent}%)${cachedLabel}`;
    const line2 = `Current chunk time: ${(durationMs / 1000).toFixed(1)}s`;
    const line3 = `Avg time per chunk: ${(avgMs / 1000).toFixed(1)}s`;
    const line4 = `ETA: ${formatDuration(etaMs)}`;

    process.stdout.write(`\x1b[2K\r${line1}\n${line2}\n${line3}\n${line4}`);
    if (state.processed < state.total) {
      process.stdout.write('\x1b[4A');
    } else {
      process.stdout.write('\n');
    }
  }

  return { tick };
}

module.exports = {
  createProgress,
};
