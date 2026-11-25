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
  listenInBackground({
    'remoteConfig:get': () => getRemoteConfig(),
    // Answer from storage at once so the panel never waits on the network; a due re-check
    // runs afterwards and reaches open panels through the storage change it writes.
    'license:get': async () => {
      const state = await getLicenseState();
      void refreshLicenseIfStale();
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
    void getRemoteConfig({ force: true });
  });

  void getRemoteConfig();
  void refreshLicenseIfStale();
});
