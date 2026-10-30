// usage: node shot.js out.png "m=heart&x=1" [w h]
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{
 const [out,qs,w=1280,h=760]=process.argv.slice(2);
 const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
 const p=await b.newPage({viewport:{width:+w,height:+h}});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.goto('http://127.0.0.1:5199/harness.html?'+qs);
 await p.waitForFunction('window.__ready',null,{timeout:60000}).catch(()=>{});
 await p.waitForTimeout(2500);
 await p.screenshot({path:out});
 console.log('errors:',errs.slice(0,5));
 await b.close();
})();
