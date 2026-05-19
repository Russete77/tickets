const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Habilita lock task (screen pinning / kiosk) na Activity principal.
 * Operador de bar não pode sair do app num device que move dinheiro.
 */
module.exports = function withAndroidLockTask(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) return cfg;
    const activity = (app.activity || []).find(
      (a) => a.$['android:name'] === '.MainActivity',
    );
    if (activity) {
      activity.$['android:lockTaskMode'] = 'if_whitelisted';
    }
    return cfg;
  });
};
