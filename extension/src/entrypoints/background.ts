import { DEFAULT_LICENSE_STATE, DEFAULT_REMOTE_CONFIG } from '@stowlet/shared';
import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { buildExport } from '@/lib/export';
import { getLicenseState, refreshLicenseIfStale, setLicenseKey } from '@/lib/license';
import { log } from '@/lib/log';
import { listenInBackground } from '@/lib/messaging';
import { getRemoteConfig } from '@/lib/remoteConfig';

/**
 * Background service worker: license state, remote-config cache, export jobs.
 * It never sees vendor endpoints and never logs chat content.
 */
export default defineBackground(() => {
  // The e2e build must not depend on the live site: it uses the bundled config (the live one
  // switches the mock adapter off) and never re-checks the made-up license its tests store.
  const remoteConfig = (opts?: { force?: boolean }) =>
    __STOWLET_E2E__ ? Promise.resolve(DEFAULT_REMOTE_CONFIG) : getRemoteConfig(opts);
  const recheckLicense = () =>
    __STOWLET_E2E__ ? Promise.resolve(DEFAULT_LICENSE_STATE) : refreshLicenseIfStale();

  listenInBackground({
    'remoteConfig:get': () => remoteConfig(),
    // Answer from storage at once so the panel never waits on the network; a due re-check
    // runs afterwards and reaches open panels through the storage change it writes.
    'license:get': async () => {
      const state = await getLicenseState();
      void recheckLicense();
      return state;
    },
    'license:setKey': (req) => setLicenseKey(req.key),
    'export:conversation': async (req) =>
      buildExport(req.conversation, req.vendorId, req.format, new Date(), {
        tags: req.tags ?? [],
        note: req.note ?? '',
      }),
  });

  browser.runtime.onInstalled.addListener(() => {
    log.info('background', 'installed');
    void remoteConfig({ force: true });
  });

  void remoteConfig();
  void recheckLicense();
});
