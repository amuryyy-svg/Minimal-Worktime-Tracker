(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./tracker-core.js"));
    return;
  }

  root.trackerTimer = factory(root.trackerCore);
})(typeof globalThis !== "undefined" ? globalThis : window, function (trackerCore) {
  if (!trackerCore) {
    throw new Error("trackerCore helpers are required for trackerTimer.");
  }

  function resolveNowMs(value) {
    const nowMs = Math.trunc(Number(value));
    return Number.isFinite(nowMs) ? nowMs : Date.now();
  }

  function createTimerRuntime(initialState = {}) {
    return {
      isRunning: Boolean(initialState.isRunning),
      segmentStartMs: null,
      isSuspended: Boolean(initialState.isSuspended),
    };
  }

  function applyPersistedTimerState(runtime, timerState = {}) {
    runtime.isRunning = Boolean(timerState?.isRunning);
    runtime.segmentStartMs = null;
    runtime.isSuspended = false;
    return runtime;
  }

  function getActiveSegmentBounds(runtime, date, options = {}) {
    if (!runtime.isRunning || runtime.segmentStartMs === null || runtime.isSuspended) {
      return null;
    }

    const nowMs = resolveNowMs(options.nowMs);
    const dayBounds = trackerCore.getBusinessDayBoundsForLabelDate(date, options.dayRolloverTime);
    const overlapStartMs = Math.max(runtime.segmentStartMs, dayBounds.startMs);
    const overlapEndMs = Math.min(nowMs, dayBounds.endMs);

    if (overlapEndMs <= overlapStartMs) {
      return null;
    }

    return {
      startMs: overlapStartMs,
      endMs: overlapEndMs,
      durationMs: overlapEndMs - overlapStartMs,
    };
  }

  function getLiveWorkMs(runtime, date, options = {}) {
    const bounds = getActiveSegmentBounds(runtime, date, options);
    return bounds ? bounds.durationMs : 0;
  }

  function getLiveSessionEntry(runtime, date, options = {}) {
    const bounds = getActiveSegmentBounds(runtime, date, options);

    if (!bounds) {
      return null;
    }

    return {
      type: "interval",
      startMs: bounds.startMs,
      endMs: bounds.endMs,
      durationMs: bounds.durationMs,
      source: options.source ?? "timer",
    };
  }

  function flushTimer(runtime, days, options = {}) {
    if (!runtime.isRunning || runtime.segmentStartMs === null) {
      return false;
    }

    if (runtime.isSuspended && options.allowWhileSuspended !== true) {
      return false;
    }

    const nowMs = resolveNowMs(options.nowMs);
    const changed = trackerCore.addIntervalToDays(days, runtime.segmentStartMs, nowMs, options.source ?? "timer", {
      dayRolloverTime: options.dayRolloverTime,
    });
    runtime.segmentStartMs = nowMs;
    return changed;
  }

  function startTimer(runtime, options = {}) {
    if (runtime.isRunning) {
      return false;
    }

    runtime.isRunning = true;
    runtime.isSuspended = false;
    runtime.segmentStartMs = resolveNowMs(options.nowMs);
    return true;
  }

  function stopTimer(runtime, days, options = {}) {
    const changed = flushTimer(runtime, days, {
      ...options,
      allowWhileSuspended: true,
    });

    runtime.isRunning = false;
    runtime.segmentStartMs = null;
    runtime.isSuspended = false;
    return changed;
  }

  function handleSystemPause(runtime, days, options = {}) {
    if (runtime.isSuspended) {
      return false;
    }

    const changed = flushTimer(runtime, days, {
      ...options,
      allowWhileSuspended: true,
    });

    runtime.segmentStartMs = null;
    runtime.isSuspended = true;
    return changed;
  }

  function handleSystemResume(runtime, options = {}) {
    if (!runtime.isSuspended) {
      return false;
    }

    runtime.isSuspended = false;

    if (runtime.isRunning) {
      runtime.segmentStartMs = resolveNowMs(options.nowMs);
    }

    return true;
  }

  return {
    applyPersistedTimerState,
    createTimerRuntime,
    flushTimer,
    getLiveWorkMs,
    getLiveSessionEntry,
    handleSystemPause,
    handleSystemResume,
    startTimer,
    stopTimer,
  };
});
