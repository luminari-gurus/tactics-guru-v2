from pathlib import Path
import sys

file=Path(sys.argv[1]);text=file.read_text()
start=text.index('  await page.addInitScript(() => {');end=text.index('  await use();',start)
extra=r'''  page.on('requestfailed',request=>{
   const path=assetPath(request.url());if(path==='[other]')return;
   const url=new URL(request.url());if(url.protocol!=='http:'||!['127.0.0.1','localhost'].includes(url.hostname))return;
   record({kind:'native-request-failure',path,message:String(request.failure()?.errorText??'').replace(/https?:\/\/\S+/g,'[url]').slice(0,256)});
  });
  page.on('response',response=>{
   const path=assetPath(response.url());if(path==='[other]')return;
   const headers=response.headers();
   record({kind:'asset-response',path,status:response.status(),cacheControl:headers['cache-control']?.slice(0,120),connection:headers.connection?.slice(0,32),length:headers['content-length']?.slice(0,20)});
  });
'''
file.write_text(text[:start]+extra+text[end:])
