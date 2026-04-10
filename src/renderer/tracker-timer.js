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
      lastTickMs: null,
      isSuspended: Boolean(initialState.isSuspended),
    };
  }

  function applyPersistedTimerState(runtime, timerState = {}) {
    runtime.isRunning = Boolean(timerState?.isRunning);
    runtime.lastTickMs = null;
    runtime.isSuspended = false;
    return runtime;
  }

  function getLiveWorkMs(runtime, date, options = {}) {
    if (!runtime.isRunning || runtime.lastTickMs === null || runtime.isSuspended) {
      return 0;
    }

    const nowMs = resolveNowMs(options.nowMs);
    const dayStartMs = trackerCore.startOfDay(date).getTime();
    const nextDayStartMs = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
    const overlapStartMs = Math.max(runtime.lastTickMs, dayStartMs);
    const overlapEndMs = Math.min(nowMs, nextDayStartMs);

    return Math.max(0, overlapEndMs - overlapStartMs);
  }

  function flushTimer(runtime, days, options = {}) {
    if (!runtime.isRunning || runtime.lastTickMs === null) {
      return false;
    }

    if (runtime.isSuspended && options.allowWhileSuspended !== true) {
      return false;
    }

    const nowMs = resolveNowMs(options.nowMs);
    const changed = trackerCore.addIntervalToDays(days, runtime.lastTickMs, nowMs, options.source ?? "timer");
    runtime.lastTickMs = nowMs;
    return changed;
  }

  function startTimer(runtime, options = {}) {
    if (runtime.isRunning) {
      return false;
    }

    runtime.isRunning = true;
    runtime.lastTickMs = resolveNowMs(options.nowMs);
    return true;
  }

  function stopTimer(runtime, days, options = {}) {
    const changed = flushTimer(runtime, days, {
      ...options,
      allowWhileSuspended: true,
    });

    runtime.isRunning = false;
    runtime.lastTickMs = null;
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

    runtime.isSuspended = true;
    return changed;
  }

  function handleSystemResume(runtime, options = {}) {
    if (!runtime.isSuspended) {
      return false;
    }

    runtime.isSuspended = false;

    if (runtime.isRunning) {
      runtime.lastTickMs = resolveNowMs(options.nowMs);
    }

    return true;
  }

  return {
    applyPersistedTimerState,
    createTimerRuntime,
    flushTimer,
    getLiveWorkMs,
    handleSystemPause,
    handleSystemResume,
    startTimer,
    stopTimer,
  };
});
