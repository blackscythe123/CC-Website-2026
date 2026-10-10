(()=>{"use strict";module.exports=[51578,e=>{var t=e.i(96396);async function r(e){let{searchParams:r}=new URL(e.url),n=r.get("code"),a=r.get("error"),i=r.get("error_description");if(a){let e=`
      <!DOCTYPE html>
      <html>
        <body style="font-family: sans-serif; padding: 2rem; text-align: center;">
          <h2>Authentication Failed</h2>
          <p>${i||a}</p>
        </body>
      </html>
    `;return new t.NextResponse(e,{status:400,headers:{"Content-Type":"text/html"}})}if(!n)return new t.NextResponse("Authorization code is missing",{status:400});let o=process.env.OAUTH_GITHUB_CLIENT_ID,s=process.env.OAUTH_GITHUB_CLIENT_SECRET;if(!o||!s)return new t.NextResponse("OAUTH_GITHUB_CLIENT_ID or OAUTH_GITHUB_CLIENT_SECRET is missing in environment variables",{status:500});try{let e=await fetch("https://github.com/login/oauth/access_token",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json","User-Agent":"apex-club-cms-studio"},body:JSON.stringify({client_id:o,client_secret:s,code:n})}),r=await e.json();if(r.error||!r.access_token){let e=r.error_description||r.error||"Failed to exchange token";return new t.NextResponse(`GitHub token exchange error: ${e}`,{status:400})}let a=r.access_token,i=`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authorized</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #f8fafc;
            }
            .card {
              background: #ffffff;
              padding: 2rem 2.5rem;
              border-radius: 12px;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h3>Authentication Successful</h3>
            <p>Connecting to CMS Studio and closing...</p>
          </div>
          <script>
            (function() {
              const token = ${JSON.stringify(a)};
              const message = 'authorization:github:success:' + JSON.stringify({
                token: token,
                provider: 'github'
              });

              function receiveMessage(e) {
                window.opener.postMessage(message, e ? e.origin : '*');
                setTimeout(function() { window.close(); }, 250);
              }

              window.addEventListener("message", receiveMessage, false);
              window.opener.postMessage("authorizing:github", "*");

              setTimeout(function() {
                window.opener.postMessage(message, "*");
                setTimeout(function() { window.close(); }, 350);
              }, 600);
            })();
          </script>
        </body>
      </html>
    `;return new t.NextResponse(i,{status:200,headers:{"Content-Type":"text/html"}})}catch(r){let e=r instanceof Error?r.message:"Internal Server Error";return new t.NextResponse(`Error in OAuth callback: ${e}`,{status:500})}}e.s(["GET",0,r])},48499,e=>{var t=e.i(13720),r=e.i(79250),n=e.i(10989),a=e.i(54582),i=e.i(96277),o=e.i(28960),s=e.i(46423),l=e.i(91601),c=e.i(34740),u=e.i(77241),d=e.i(75346),p=e.i(70615),h=e.i(29862),f=e.i(30483),m=e.i(82083),g=e.i(93695),w=e.i(95631);e.i(25619);var v=e.i(75247);let x=new t.AppRouteRouteModule({definition:{kind:r.f.APP_ROUTE,page:"/api/callback/route",pathname:"/api/callback",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/apps/cms-studio/src/app/api/callback/route.ts",nextConfigOutput:"",userland:()=>e.r(51578),...{}}),{workAsyncStorage:R,workUnitAsyncStorage:y,serverHooks:b}=x;async function E(e,t,n){n.requestMeta&&(0,a.R)(e,n.requestMeta),x.isDev&&(0,a.i)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let R="/api/callback/route";R=R.replace(/\/index$/,"")||"/";let y=await x.prepare(e,t,{srcPage:R,multiZoneDraftMode:!1});if(!y)return t.statusCode=400,t.end("Bad Request"),null==n.waitUntil||n.waitUntil.call(n,Promise.resolve()),null;let{buildId:b,deploymentId:E,params:T,nextConfig:C,parsedUrl:A,isDraftMode:S,prerenderManifest:k,routerServerContext:O,isOnDemandRevalidate:U,revalidateOnlyGenerated:_,resolvedPathname:P,clientReferenceManifest:I,serverActionsManifest:N,previewProps:M}=y,H=(0,s.f)(R),D=!!k.routes[P]&&(x.isDev||(0,w.f)(P,x.cacheOwner,k.routes[P])),L=!!(k.dynamicRoutes[H]||D),q=async()=>((null==O?void 0:O.render404)?await O.render404(e,t,A,!1):t.end("This page could not be found"),null);if(L&&!S){let e=k.dynamicRoutes[H];if(e&&!1===e.fallback&&!D){if(C.adapterPath)return await q();throw new g.NoFallbackError}}let G=null;!L||x.isDev||S||(G="/index"===(G=P)?"/":G),N&&I&&(0,o.f)({page:R,clientReferenceManifest:I,serverActionsManifest:N});let $=e.method||"GET",j=(0,i.v)(),B=j.getActiveScopeSpan(),F=!!(null==O?void 0:O.isWrappedByNextServer),J=!!(0,a.w)(e,"minimalMode"),z=(0,a.w)(e,"incrementalCache")||await x.getIncrementalCache(e,C,M,k,J);null==z||z.resetRequestCache(),globalThis.__incrementalCache=z;let K={params:T,previewProps:M,renderOpts:{experimental:{authInterrupts:!!C.experimental.authInterrupts,useCacheTimeout:C.experimental.useCacheTimeout,durableUseCacheEntries:!!C.experimental.durableUseCacheEntries},cacheComponents:!!C.cacheComponents,validationLevel:C.experimental.instantInsights.validationLevel,isDraftMode:S,incrementalCache:z,hmrRefreshHash:(0,a.w)(e,"hmrRefreshHash"),cacheLifeProfiles:C.cacheLife,staticPageGenerationTimeout:C.staticPageGenerationTimeout,waitUntil:n.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0},sharedContext:{buildId:b,deploymentId:E}},V=new l.x(e),Q=new l.e(t),W=c.k.fromNodeNextRequest(V,(0,c.t)(t)),Y=async({previousCacheEntry:r})=>{try{if(!J&&U&&_&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let a=null===G?await x.handle(W,K):await x.prerender(W,K);e.fetchMetrics=K.renderOpts.fetchMetrics;let i=K.renderOpts.pendingWaitUntil;i&&n.waitUntil&&(n.waitUntil(i),i=void 0);let o=K.renderOpts.collectedTags;if(!L)return await (0,p.f)(V,Q,a,i),null;{let e=await a.blob(),t=(0,h.S)(a.headers);o&&(t[m.M]=o),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==K.renderOpts.collectedRevalidate&&!(K.renderOpts.collectedRevalidate>=m.Q)&&K.renderOpts.collectedRevalidate,n=void 0===K.renderOpts.collectedExpire||K.renderOpts.collectedExpire>=m.Q?!1!==r&&r>0?C.expireTime:void 0:K.renderOpts.collectedExpire;return{value:{kind:v.x.APP_ROUTE,status:a.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:n}}}}catch(t){throw(null==r?void 0:r.isStale)&&await x.onRequestError(e,t,{routerKind:"App Router",routePath:R,routeType:"route",revalidateReason:(0,d.f)({isStaticGeneration:null!==G,isOnDemandRevalidate:U})},!1,O),t}},Z=async(a,o)=>{try{var s,l;let a=await x.handleResponse({req:e,nextConfig:C,cacheKey:G,routeKind:r.f.APP_ROUTE,isFallback:!1,previewProps:M,prerenderManifest:k,isRoutePPREnabled:!1,isOnDemandRevalidate:U,revalidateOnlyGenerated:_,responseGenerator:Y,waitUntil:n.waitUntil,isMinimalMode:J});if(null!==a&&"error"in a)throw a.error;if(!L)return;if((null==a||null==(s=a.value)?void 0:s.kind)!==v.x.APP_ROUTE)throw Error(`Invariant: app-route received invalid cache entry ${null==a||null==(l=a.value)?void 0:l.kind}`);J||t.setHeader("x-nextjs-cache",U?"REVALIDATED":a.isMiss?"MISS":a.isStale?"STALE":"HIT"),S&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let i=(0,h.G)(a.value.headers);J&&L||i.delete(m.M),!a.cacheControl||t.getHeader("Cache-Control")||i.get("Cache-Control")||i.set("Cache-Control",(0,f.f)(a.cacheControl)),await (0,p.f)(V,Q,new Response(a.value.body,{headers:i,status:a.value.status||200}));return}catch(r){if(r instanceof g.NoFallbackError||await x.onRequestError(e,r,{routerKind:"App Router",routePath:H,routeType:"route",revalidateReason:(0,d.f)({isStaticGeneration:null!==G,isOnDemandRevalidate:U})},!1,O),L)throw r;if(t.headersSent){if(a){let e=r instanceof Error?r:Error("Unknown app route error");a.recordException(e),a.setStatus({code:i.J.ERROR,message:e.message}),a.setAttribute("error.type",e.name)}t.writableEnded||t.destroyed||t.end()}else await (0,p.f)(V,Q,new Response(null,{status:500}));return}finally{(()=>{if(!a)return;let e=t.statusCode;a.setAttributes({"http.status_code":e,"next.rsc":!1}),e&&e>=500&&(a.setStatus({code:i.J.ERROR}),a.setAttribute("error.type",e.toString()));let r=j.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==u.q.handleRequest)return console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=r.get("next.route")||H,s=`${$} ${n}`;a.setAttributes({"next.route":n,"http.route":n,"next.span_name":s}),a.updateName(s),o&&o!==a&&(o.setAttribute("http.route",n),o.updateName(s))})()}};if(F&&B)await Z(B,void 0);else{let t=j.getActiveScopeSpan();await j.withPropagatedContext(e.headers,()=>j.trace(u.q.handleRequest,{spanName:`${$} ${R}`,kind:i.C.SERVER,attributes:{"http.method":$,"http.target":e.url}},e=>Z(e,t)),void 0,!F)}}e.s(["handler",0,E,"patchFetch",0,function(){return(0,n.f)({workAsyncStorage:R,workUnitAsyncStorage:y})},"routeModule",0,x,"serverHooks",0,b,"workAsyncStorage",0,R,"workUnitAsyncStorage",0,y])}]})();

//# sourceMappingURL=_1_sdugawwbru8._.js.map