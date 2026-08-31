(() => {
  const host = globalThis.parent;
  if (!host || host === globalThis) return;

  const hostRequestAnimationFrame = host.requestAnimationFrame?.bind(host);
  const hostCancelAnimationFrame = host.cancelAnimationFrame?.bind(host);
  if (!hostRequestAnimationFrame || !hostCancelAnimationFrame) return;

  /*
   * Firefox/GeckoView 会降低屏幕外 iframe 的动画帧频率。工坊界面实际
   * 挂载在顶层页面，所以把运行容器的 rAF 委托给前台窗口更符合实际。
   */
  globalThis.requestAnimationFrame = callback => hostRequestAnimationFrame(timestamp => callback(timestamp));
  globalThis.cancelAnimationFrame = handle => hostCancelAnimationFrame(handle);
  globalThis.__PMM_GECKO_FRAME_SCHEDULER_V277__ = true;
})();
