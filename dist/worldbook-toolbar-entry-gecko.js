/* ===== Gecko 兼容版：底部工具栏“世界书”入口 ===== */
(() => {
  'use strict';

  const SELF = window;
  const TOP = (() => { try { return window.top || window; } catch (_) { return window; } })();
  const DOC = TOP.document || document;
  const API_KEY = '__PMM_WORLDBOOK_SLOT_GECKO__';
  const BUTTON_MARK = 'data-pmm-worldbook-placeholder';
  const LOADER_KEY = '__PMM_LOAD_WORLDBOOK_STITCH__';
  const LOG_PREFIX = '[预设工坊（Gecko兼容测试版）]';
  const TOP_NOTIFICATION_STORAGE_KEY = 'pmm_top_notifications_enabled_v1';
  let observer = null;
  let frameId = 0;
  let openingPromise = null;

  try { TOP[API_KEY]?.cleanup?.(); } catch (_) {}

  function topNotificationsEnabled() {
    try { return (TOP.localStorage || SELF.localStorage)?.getItem(TOP_NOTIFICATION_STORAGE_KEY) !== '0'; }
    catch (_) { return true; }
  }

  function copyScopeAttributes(source, target) {
    if (!source || !target) return;
    for (const attribute of source.attributes) {
      if (attribute.name.startsWith('data-v-')) target.setAttribute(attribute.name, '');
    }
  }

  function openWorldbook() {
    if (openingPromise) return openingPromise;
    openingPromise = (async () => {
      let api = TOP.__PMM_WORLDBOOK_STITCH_TEST3__;
      if (typeof api?.open !== 'function') {
        const loader = SELF[LOADER_KEY];
        if (typeof loader !== 'function') throw new Error('世界书按需加载器尚未就绪');
        api = await loader();
      }
      if (typeof api?.open !== 'function') throw new Error('世界书模块没有提供打开接口');
      return api.open();
    })().finally(() => { openingPromise = null; });
    return openingPromise;
  }

  async function stopPlaceholderAction(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    const button = event.currentTarget;
    if (button?.dataset.pmmWorldbookLoading === '1') return;
    const icon = button?.querySelector('i');
    const iconClass = icon?.className || '';
    button?.setAttribute('aria-busy', 'true');
    button?.setAttribute('data-pmm-worldbook-loading', '1');
    if (icon) icon.className = 'fa-solid fa-spinner fa-spin';
    try {
      await openWorldbook();
    } catch (error) {
      console.error(`${LOG_PREFIX} 世界书按需加载失败`, error);
      if (topNotificationsEnabled()) {
        TOP.toastr?.error?.('世界书加载失败，请重试', '预设工坊（Gecko兼容测试版）');
      }
    } finally {
      button?.removeAttribute('aria-busy');
      button?.removeAttribute('data-pmm-worldbook-loading');
      if (icon) icon.className = iconClass || 'fa-solid fa-book-atlas';
    }
  }

  function createButton(toolbar) {
    const templateButton = toolbar.querySelector('.panel-btn:last-of-type') || toolbar.querySelector('.panel-btn');
    if (!templateButton) return null;
    const button = DOC.createElement('button');
    button.type = 'button';
    button.className = 'panel-btn pmm-worldbook-placeholder';
    button.title = '世界书';
    button.setAttribute('aria-label', '打开世界书缝合');
    button.setAttribute(BUTTON_MARK, '1');
    copyScopeAttributes(templateButton, button);

    const icon = DOC.createElement('i');
    icon.className = 'fa-solid fa-book-atlas';
    icon.setAttribute('aria-hidden', 'true');
    copyScopeAttributes(templateButton.querySelector('i'), icon);
    const label = DOC.createElement('span');
    label.className = 'btn-label';
    label.textContent = '世界书';
    copyScopeAttributes(templateButton.querySelector('.btn-label'), label);
    button.append(icon, label);
    button.addEventListener('click', stopPlaceholderAction, true);
    button.addEventListener('dblclick', stopPlaceholderAction, true);
    return button;
  }

  function installIntoToolbars() {
    for (const toolbar of DOC.querySelectorAll('.side-panel-root .panel-buttons')) {
      if (toolbar.querySelector(`[${BUTTON_MARK}="1"]`)) continue;
      const button = createButton(toolbar);
      if (button) toolbar.append(button);
    }
  }

  function scheduleInstall() {
    if (frameId) return;
    frameId = TOP.requestAnimationFrame(() => {
      frameId = 0;
      installIntoToolbars();
    });
  }

  function mutationTouchesToolbar(mutation) {
    const target = mutation.target;
    if (target?.nodeType === 1 && target.matches?.('.side-panel-root, .panel-buttons')) return true;
    return [...mutation.addedNodes].some(node => node.nodeType === 1 && (
      node.matches?.('.side-panel-root, .panel-buttons, #preset-manager-main-panel')
      || node.querySelector?.('.side-panel-root .panel-buttons')
    ));
  }

  function cleanup() {
    observer?.disconnect();
    observer = null;
    if (frameId) TOP.cancelAnimationFrame(frameId);
    frameId = 0;
    DOC.querySelectorAll(`[${BUTTON_MARK}="1"]`).forEach(button => button.remove());
    try { if (TOP[API_KEY]?.cleanup === cleanup) delete TOP[API_KEY]; } catch (_) {}
  }

  installIntoToolbars();
  observer = new (TOP.MutationObserver || MutationObserver)(mutations => {
    if (mutations.some(mutationTouchesToolbar)) scheduleInstall();
  });
  observer.observe(DOC.documentElement, { childList: true, subtree: true });
  TOP[API_KEY] = { cleanup, install: installIntoToolbars };
  console.info(`${LOG_PREFIX} 已添加“世界书”工具栏入口。`);
})();
