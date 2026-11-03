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
