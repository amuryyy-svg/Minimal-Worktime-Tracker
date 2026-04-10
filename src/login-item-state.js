function readEffectiveAutostart(loginItemSettings = {}) {
  if (typeof loginItemSettings.executableWillLaunchAtLogin === "boolean") {
    return loginItemSettings.executableWillLaunchAtLogin;
  }

  return loginItemSettings.openAtLogin === true;
}

function createBootstrapState(loginItemSettings = {}) {
  return {
    autostart: readEffectiveAutostart(loginItemSettings),
    launchedAtLogin: loginItemSettings.wasOpenedAtLogin === true,
  };
}

function ensureBootstrapAutostart(loginItemSettings = {}, expectedAutostart, errorMessage) {
  const bootstrapState = createBootstrapState(loginItemSettings);

  if (bootstrapState.autostart !== expectedAutostart) {
    throw new Error(errorMessage);
  }

  return bootstrapState;
}

module.exports = {
  readEffectiveAutostart,
  createBootstrapState,
  ensureBootstrapAutostart,
};
