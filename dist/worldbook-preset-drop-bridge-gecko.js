/* ===== Gecko 兼容版：世界书 → 预设显式拖入桥 ===== */
(() => {
  'use strict';

  const SELF = window;
  const TOP = (() => { try { return window.top || window; } catch (_) { return window; } })();
  const API_KEY = '__PMM_WORLDBOOK_PRESET_DROP_BRIDGE__';

  try { TOP[API_KEY]?.cleanup?.(); } catch (_) {}

  function asArray(value) {
    const raw = value?.value ?? value;
    return Array.isArray(raw) ? raw : null;
  }

  function normalizedName(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function mainPanel() {
    const documentObject = TOP.document || document;
    return documentObject.querySelector('#preset-manager-main-panel .preset-panel')
      || documentObject.querySelector('#preset-manager-main-panel');
  }

  function findDispatcher() {
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
          const handlers = sources.flatMap(source => [
            source.onCrossPanelDrop,
            source['onCross-panel-drop'],
            source.onCrossPanelDropOnce,
          ]).flat().filter(handler => typeof handler === 'function');
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

  const bridge = { drop, cleanup: () => {
    try { if (TOP[API_KEY] === bridge) delete TOP[API_KEY]; } catch (_) {}
    try { if (SELF[API_KEY] === bridge) delete SELF[API_KEY]; } catch (_) {}
  } };
  TOP[API_KEY] = bridge;
  SELF[API_KEY] = bridge;
})();
