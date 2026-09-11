/* ===== Gecko 兼容版：世界书 → 预设显式拖入桥 ===== */
(() => {
  'use strict';

  const SELF = window;
  const PARENT = (() => { try { return window.parent || window; } catch (_) { return window; } })();
  const TOP = (() => { try { return window.top || PARENT; } catch (_) { return PARENT; } })();
  const API_KEY = '__PMM_WORLDBOOK_PRESET_DROP_BRIDGE__';
  const VUE_TRACKER_KEY = '__PMM_WORLDBOOK_VUE_APP_TRACKER__';

  function ownerWindows() {
    return [...new Set([SELF, PARENT, TOP])].filter(owner => {
      try { return Boolean(owner?.document); } catch (_) { return false; }
    });
  }

  for (const owner of ownerWindows()) {
    try { owner[API_KEY]?.cleanup?.(); } catch (_) {}
  }

  function asArray(value) {
    const raw = value?.value ?? value;
    return Array.isArray(raw) ? raw : null;
  }

  function normalizedName(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function mainPanel() {
    for (const owner of ownerWindows()) {
      const documentObject = owner.document;
      const panel = documentObject.querySelector('#preset-manager-main-panel .preset-panel')
        || documentObject.querySelector('#preset-manager-main-panel');
      if (panel) return panel;
    }
    return null;
  }

  /*
   * Gecko 会把工坊渲染到父页面；从 runtime iframe 回读父页面 DOM 上的
   * __vueParentComponent 并不可靠。工坊加载前先挂钩 Vue.createApp，随后
   * 从同一运行时保存的 Vue 应用树取得 onCrossPanelDrop 闭包。
   */
  function installVueAppTracker() {
    const vue = SELF.Vue;
    if (!vue || typeof vue.createApp !== 'function') return null;
    const existing = vue[VUE_TRACKER_KEY];
    if (existing?.apps instanceof Set) return existing;

    const tracker = { apps: new Set(), dispatchers: [], originalCreateApp: vue.createApp };
    try {
      vue.createApp = function trackedCreateApp(...args) {
        const app = tracker.originalCreateApp.apply(this, args);
        tracker.apps.add(app);
        try {
          app.mixin({
            mounted() {
              const dispatcher = dispatcherFromComponent(this.$);
              if (!dispatcher) return;
              tracker.dispatchers = tracker.dispatchers.filter(item => item.component !== dispatcher.component);
              tracker.dispatchers.push(dispatcher);
            },
            unmounted() {
              tracker.dispatchers = tracker.dispatchers.filter(item => item.component !== this.$);
            },
          });
        } catch (_) {}
        const originalMount = app.mount;
        if (typeof originalMount === 'function') {
          app.mount = function trackedMount(...mountArgs) {
            const result = originalMount.apply(this, mountArgs);
            tracker.apps.add(app);
            return result;
          };
        }
        return app;
      };
      vue[VUE_TRACKER_KEY] = tracker;
    } catch (_) {
      return null;
    }
    return tracker;
  }

  const vueTracker = installVueAppTracker();

  function handlerList(source) {
    if (!source) return [];
    return [...new Set([
      source.onCrossPanelDrop,
      source['onCross-panel-drop'],
      source.onCrossPanelDropOnce,
    ].flat().filter(handler => typeof handler === 'function'))];
  }

  function componentHandlers(component) {
    if (!component) return [];
    return [...new Set([
      ...handlerList(component.vnode?.props),
      ...handlerList(component.props),
      ...handlerList(component.attrs),
    ])];
  }

  function componentSide(component) {
    return String(
      component?.props?.side
      ?? component?.vnode?.props?.side
      ?? component?.attrs?.side
      ?? '',
    );
  }

  function componentNodes(component) {
    return [
      component?.vnode?.el,
      component?.vnode?.anchor,
      component?.subTree?.el,
      component?.subTree?.anchor,
    ].filter(Boolean);
  }

  function componentBelongsToPanel(component, panel) {
    if (!panel?.contains) return true;
    let inspectedNode = false;
    for (const node of componentNodes(component)) {
      if (!node || typeof node !== 'object' || !('nodeType' in node)) continue;
      inspectedNode = true;
      try {
        if (node === panel || panel.contains(node)) return true;
      } catch (_) {}
    }
    // A component can be mounted before Vue has assigned its element. Keep it
    // as a fallback, but never prefer it over a live component inside the panel.
    return !inspectedNode;
  }

  function dispatcherPriority(dispatcher, panel) {
    const component = dispatcher?.component;
    if (!component || component.isUnmounted || component.scope?.active === false) return -1;
    if (!componentBelongsToPanel(component, panel)) return -1;
    const nodes = componentNodes(component);
    const name = String(component.type?.__name || component.vnode?.type?.__name || '');
    return (nodes.length ? 1000 : 0)
      + (componentSide(component) === 'left' ? 100 : 0)
      + (name === 'PromptPanel' || name === 'PresetPanel' ? 10 : 0)
      + (nodes.length ? 1 : 0);
  }

  function dispatcherFromComponent(component) {
    if (!component) return null;
    const handlers = componentHandlers(component);
    if (!handlers.length) return null;
    return {
      component,
      drop: async (...args) => {
        // Vue replaces vnode props while a preset keeps unsaved changes. Read
        // them at dispatch time so a handler captured before a worldbook switch
        // cannot keep pointing at the previous draft.
        for (const handler of componentHandlers(component)) await handler(...args);
      },
    };
  }

  function findVueDispatcher() {
    const panel = mainPanel();
    const seenComponents = new Set();
    const seenVNodes = new Set();
    let best = null;
    let bestPriority = -1;
    const consider = component => {
      const dispatcher = dispatcherFromComponent(component);
      const priority = dispatcherPriority(dispatcher, panel);
      if (dispatcher && priority > bestPriority) {
        best = dispatcher;
        bestPriority = priority;
      }
    };
    const findInComponent = component => {
      if (!component || seenComponents.has(component)) return;
      seenComponents.add(component);
      consider(component);
      findInVNode(component.subTree);
      findInVNode(component.vnode);
    };
    const findInVNode = vnode => {
      if (!vnode || typeof vnode !== 'object' || seenVNodes.has(vnode)) return;
      seenVNodes.add(vnode);
      findInComponent(vnode.component);
      const children = Array.isArray(vnode.children) ? vnode.children : Object.values(vnode.children || {});
      for (const child of [...children, ...(vnode.dynamicChildren || [])]) findInVNode(child);
      findInVNode(vnode.ssContent);
    };

    for (const app of vueTracker?.apps || []) {
      findInComponent(app?._instance);
    }
    if (best) return best;

    // Some Gecko builds do not expose a complete Vue subtree across the iframe
    // boundary. The mounted list remains a fallback, but validate every entry
    // against the live left preset panel instead of blindly using the last one.
    for (const mounted of [...(vueTracker?.dispatchers || [])].reverse()) {
      consider(mounted?.component);
      if (best) return best;
    }
    return null;
  }

  function findDispatcher() {
    const vueDispatcher = findVueDispatcher();
    if (vueDispatcher) return vueDispatcher;
    const panel = mainPanel();
    if (!panel) return null;
    const seen = new Set();
    const roots = [panel, ...panel.querySelectorAll('.prompt-panel, .prompt-panel *')];
    for (const root of roots) {
      for (let element = root; element && panel.contains(element); element = element.parentElement) {
        for (let component = element.__vueParentComponent || null, depth = 0; component && depth < 24; depth++, component = component.parent) {
          if (seen.has(component)) continue;
          seen.add(component);
          if (typeof component.emit !== 'function') continue;
          const sources = [component.vnode?.props, component.props, component.attrs].filter(Boolean);
          const handlers = sources.flatMap(handlerList);
          if (handlers.length) {
            return {
              component,
              drop: async (...args) => {
                for (const handler of handlers) await handler(...args);
              },
            };
          }
        }
      }
    }
    return null;
  }

  function currentPrompts(dispatcher) {
    for (let component = dispatcher?.component || null, depth = 0; component && depth < 24; depth++, component = component.parent) {
      const prompts = asArray(component.props?.prompts)
        || asArray(component.vnode?.props?.prompts)
        || asArray(component.setupState?.prompts);
      if (prompts) return prompts;
    }
    return [];
  }

  function currentPresetName() {
    const panel = mainPanel();
    const select = panel?.querySelector?.('.title-select');
    return String(select?.value || select?.selectedOptions?.[0]?.textContent || '').trim();
  }

  function snapshot() {
    const dispatcher = findDispatcher();
    if (!dispatcher) return null;
    return {
      name: currentPresetName(),
      prompts: currentPrompts(dispatcher),
    };
  }

  function resolveTargetId(payload, dispatcher) {
    const prompts = currentPrompts(dispatcher);
    const requestedId = String(payload?.targetId || '').trim();
    if (requestedId && prompts.some(prompt => String(prompt?.id || '') === requestedId)) return requestedId;
    const requestedName = normalizedName(payload?.targetName);
    if (!requestedName) return '';
    const matches = prompts.filter(prompt => normalizedName(prompt?.name) === requestedName);
    return matches.length === 1 ? String(matches[0]?.id || '') : '';
  }

  async function drop(payload = {}) {
    const entries = Array.isArray(payload.entries) ? payload.entries : [];
    if (!entries.length) return { ok: false, count: 0, reason: 'empty' };
    const dispatcher = findDispatcher();
    if (!dispatcher) return { ok: false, count: 0, reason: 'bridge-unavailable' };
    const hasTarget = Boolean(String(payload.targetId || '').trim() || normalizedName(payload.targetName));
    const targetId = resolveTargetId(payload, dispatcher);
    if (hasTarget && !targetId) return { ok: false, count: 0, reason: 'target-not-resolved' };
    const args = [
      entries,
      targetId,
      payload.position === 'before' ? 'before' : 'after',
      String(payload.targetSectionId || '') || undefined,
      undefined,
      false,
    ];
    await dispatcher.drop(...args);
    return { ok: true, count: entries.length };
  }

  const bridge = { drop, snapshot, cleanup: () => {
    for (const owner of ownerWindows()) {
      try { if (owner[API_KEY] === bridge) delete owner[API_KEY]; } catch (_) {}
    }
  } };
  for (const owner of ownerWindows()) {
    try { owner[API_KEY] = bridge; } catch (_) {}
  }
})();
