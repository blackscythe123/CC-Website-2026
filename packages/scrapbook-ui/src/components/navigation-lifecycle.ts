/** A browser reload applies once per document, not to later client-side returns. */
let initialLoadHandled=false;
export function consumeInitialReload(){
 if(initialLoadHandled)return false;
 initialLoadHandled=true;
 return (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined)?.type==='reload';
}
/** Let Next copy its private history fields and synchronize its canonical URL.
 * Defer until after hydration effects, when Next's native-history integration is installed.
 */
export function replaceNavigationUrl(url:string|URL){
 const pathname=location.pathname;
 return requestAnimationFrame(()=>{if(location.pathname===pathname)history.replaceState(null,'',String(url))});
}

/** Save the section actually on screen, including navigation by ordinary scrolling. */
export function rememberVisibleSection(ids:string[],navSelector:string){
 const key='ssn:last-section:'+location.pathname;
 const save=()=>{const top=document.querySelector<HTMLElement>(navSelector)?.offsetHeight||0;let best=ids[0],largest=-1;
  for(const id of ids){const r=document.getElementById(id)?.getBoundingClientRect();if(!r)continue;const visible=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,top));if(visible>largest){largest=visible;best=id}}
  try{if(best)sessionStorage.setItem(key,best)}catch{}
 };
 window.addEventListener('pagehide',save);window.addEventListener('beforeunload',save);
 return()=>{window.removeEventListener('pagehide',save);window.removeEventListener('beforeunload',save)};
}
export function reloadSection(ids:string[],fallback:string){
 try{const saved=sessionStorage.getItem('ssn:last-section:'+location.pathname);if(saved&&ids.includes(saved))return saved}catch{}
 const hash=location.hash.slice(1);return ids.includes(hash)?hash:fallback;
}

/** Reveal the restored section immediately before its navigation-style entrance. */
export function finishSectionRestore(){const h=document.documentElement;if(h.dataset.sectionRestoreTimer)clearTimeout(Number(h.dataset.sectionRestoreTimer));delete h.dataset.sectionRestoreTimer;h.removeAttribute('data-section-restoring')}
