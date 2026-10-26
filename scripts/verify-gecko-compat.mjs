import assert from 'node:assert/strict';

export async function verifyGeckoCompat(page,frame) {
  assert.equal(await frame.evaluate(()=>__PMM_GECKO_FRAME_SCHEDULER_V277__),true);
  assert.equal(await frame.evaluate(()=>frameElement.hidden),false);
  const read=()=>frame.evaluate(()=>JSON.parse(JSON.stringify(testStores().main.prompts)));
  const before=await read();
  await page.locator('.panel-btn[title="缝合"]').click();
  await page.locator('.pmm-split-handle--top').waitFor();
  const ratio=()=>page.locator('#preset-manager-main-panel').evaluate(el=>el.style.getPropertyValue('--pmm-user-split-top'));
  const previousRatio=await ratio();
  const point=await page.locator('.pm-main-wrapper > .preset-panel').evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.bottom-10};});
  await page.evaluate(({x,y})=>{
    document.elementFromPoint(x,y).dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch',pointerId:77,isPrimary:true,clientX:x,clientY:y,button:0}));
  },point);
  assert.ok(await page.locator('.pmm-split-handle--top').evaluate(el=>el.classList.contains('pmm-split-handle--pressed')),'Bottom safe zone reaches the resize grip');
  await page.evaluate(({x,y})=>{
    for(const type of ['pointermove','pointerup'])document.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:77,isPrimary:true,clientX:x,clientY:y+55}));
  },point);
  assert.notEqual(await ratio(),previousRatio,'Dragging the bottom edge changes the split ratio');
  assert.deepEqual(await read(),before,'Resizing must not toggle or edit underlying entries');
  await page.locator('.panel-btn[title="缝合"]').click();
  await frame.evaluate(async()=>{await (await __PMM_LOAD_WORLDBOOK_STITCH__()).open();});
  const source=page.locator('[data-wb-drag-side="bottom"][data-wb-drag-key]').first();
  await source.waitFor();
  const target=page.locator('.pm-main-wrapper > .preset-panel .prompt-card[data-prompt-id]').first();
  const sourceRect=await source.boundingBox(), targetRect=await target.boundingBox();
  assert.ok(sourceRect&&targetRect);
  const from={x:sourceRect.x+sourceRect.width/2,y:sourceRect.y+sourceRect.height/2};
  const to={x:targetRect.x+targetRect.width/2,y:targetRect.y+3};
  const touch=async(type,point)=>source.evaluate((el,{type,point})=>{
    const t={identifier:3,clientX:point.x,clientY:point.y,screenX:point.x,screenY:point.y,target:el};
    const event=new Event(type,{bubbles:true,cancelable:true});
    Object.defineProperties(event,{touches:{value:type==='touchend'?[]:[t]},changedTouches:{value:[t]}});
    el.dispatchEvent(event);
  },{type,point});
  await touch('touchstart',from);await page.waitForTimeout(400);
  await touch('touchmove',to);await touch('touchend',to);
  await frame.waitForFunction(count=>testStores().main.prompts.length===count,before.length+1);
  const after=await read();
  assert.equal(after[0].name,'世界书同名条目','Long-press drop uses the intended insertion point');
  assert.deepEqual(after.slice(1),before,'Long-press drop preserves all existing entries');
  assert.equal(await page.evaluate(()=>fixtureWorldWrites),0,'Touch drop keeps source worldbook unchanged');
  await touch('touchstart',from);await touch('touchmove',{x:from.x,y:from.y+25});await page.waitForTimeout(400);await touch('touchend',to);
  assert.deepEqual(await read(),after,'Scrolling before the long press threshold cancels dragging');
  assert.ok(await page.locator('.pmm-mobile-theme-toggle').count()<=1,'Gecko worldbook mode does not duplicate theme controls');
  await page.screenshot({path:process.env.PMM_BROWSER_ASSET_DIR+'/gecko-touch-drop.png'});
  console.log('Firefox: offscreen runtime, split safe zone, touch worldbook drop, scroll cancellation and original prompt preservation passed');
}
