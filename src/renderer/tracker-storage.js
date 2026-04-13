(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./tracker-core.js"));
    return;
  }

  root.trackerStorage = factory(root.trackerCore);
})(typeof globalThis !== "undefined" ? globalThis : window, function (trackerCore) {
  if (!trackerCore) {
    throw new Error("trackerCore helpers are required for trackerStorage.");
  }

  const STORAGE_KEY = `minimal-worktime-tracker.v${trackerCore.PERSISTED_STATE_VERSION}`;
  const LEGACY_STORAGE_KEYS = [
    STORAGE_KEY,
    "minimal-worktime-tracker.v8",
    "minimal-worktime-tracker.v7",
    "minimal-worktime-tracker.v6",
    "minimal-worktime-tracker.v5",
    "minimal-worktime-tracker.v4",
    "minimal-worktime-tracker.v3",
    "minimal-worktime-tracker.v2",
    "minimal-worktime-tracker.v1",
  ];

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function getStorage(storageOverride) {
    const storage = storageOverride ?? globalThis.localStorage;

    if (!storage) {
      throw new Error("Storage is not available.");
    }

    return storage;
  }

  function createDefaultPersistedState() {
    return trackerCore.createPersistedState({});
  }

  function hasOwn(snapshot, key) {
    return Object.prototype.hasOwnProperty.call(snapshot, key);
  }

  function isCurrentPersistedSnapshot(snapshot) {
    return (
      isPlainObject(snapshot) &&
      Number.isInteger(snapshot.version) &&
      snapshot.version > 0 &&
      hasOwn(snapshot, "days") &&
      isPlainObject(snapshot.days) &&
      hasOwn(snapshot, "settings") &&
      isPlainObject(snapshot.settings) &&
      hasOwn(snapshot, "timerState") &&
      isPlainObject(snapshot.timerState)
    );
  }

  function isLegacyLogsSnapshot(snapshot) {
    return isPlainObject(snapshot) && hasOwn(snapshot, "logs") && isPlainObject(snapshot.logs);
  }

  function isRecognizedSnapshotShape(snapshot) {
    return isCurrentPersistedSnapshot(snapshot) || isLegacyLogsSnapshot(snapshot);
  }

  function parseRecognizedSnapshot(raw) {
    const parsed = JSON.parse(raw);

    if (!isRecognizedSnapshotShape(parsed)) {
      return null;
    }

    return trackerCore.createPersistedState(parsed);
  }

  function loadPersistedState(storageOverride) {
    const storage = getStorage(storageOverride);
    const fallbackState = createDefaultPersistedState();

    for (const key of LEGACY_STORAGE_KEYS) {
      try {
        const raw = storage.getItem(key);
        if (!raw) {
          continue;
        }

        const persistedState = parseRecognizedSnapshot(raw);
        if (persistedState) {
          return persistedState;
        }
      } catch {
        continue;
      }
    }

    return fallbackState;
  }

  function savePersistedState(state, storageOverride) {
    const storage = getStorage(storageOverride);
    const persistedState = trackerCore.createPersistedState(state);

    storage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
    return persistedState;
  }

  function removePersistedStateKeys(storageOverride) {
    const storage = getStorage(storageOverride);

    for (const key of LEGACY_STORAGE_KEYS) {
      try {
        storage.removeItem(key);
      } catch {
        // Ignore storage cleanup failures; the fresh state will still be written.
      }
    }
  }

  function createBackupSnapshot(state) {
    return trackerCore.createBackupPayload(state);
  }

  function normalizeImportedSnapshot(snapshot) {
    if (!isRecognizedSnapshotShape(snapshot)) {
      throw new TypeError("Unsupported backup snapshot format.");
    }

    return trackerCore.createPersistedState(snapshot);
  }

  return {
    STORAGE_KEY,
    LEGACY_STORAGE_KEYS,
    createBackupSnapshot,
    createDefaultPersistedState,
    isRecognizedSnapshotShape,
    loadPersistedState,
    normalizeImportedSnapshot,
    removePersistedStateKeys,
    savePersistedState,
  };
});
