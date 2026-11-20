import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {suite,evaluate} from './src/engine.ts';
const source = await readFile(new URL('./src/pricing.ts',import.meta.url),'utf8');
const snippets = Object.fromEntries(['baseline','candidate','corrected'].map(name => {
  const start = source.indexOf('export function '+name+'(');
  return [name,source.slice(start,source.indexOf('\n}',start)+2).replace('export ','')];
}));
const assets = new Map([['/',['index.html','text/html']],['/app.js',['app.js','text/javascript']],['/style.css',['style.css','text/css']]]);
const server = createServer(async(req,res)=>{
  function json(status:number,data:unknown) {
    res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}).end(JSON.stringify(data));
  }
  try {
    if(req.method==='GET' && req.url==='/api/release') {
      json(200,{snippets,suites:Object.fromEntries(['candidate','corrected'].map(revision=>[revision,suite.map(c=>({...evaluate(c,revision),name:c.name}))]))});return;
    }
    if(req.method==='POST' && req.url==='/api/run') {
      let body='';
      for await(const chunk of req){body+=chunk;if(body.length>4096){json(413,{error:'Case is too large.'});return;}}
      try {const data=JSON.parse(body);json(200,evaluate(data,data.revision));}
      catch(e){json(400,{error:e instanceof Error ? e.message : 'Invalid case.'});} return;
    }
    const asset=assets.get(req.url??'');
    if(req.method!=='GET'||!asset){json(404,{error:'Unknown route.'});return;}
    const bytes=await readFile(new URL('./web/'+asset[0],import.meta.url));
    res.writeHead(200,{'Content-Type':asset[1]+'; charset=utf-8'}).end(bytes);
  } catch {if(!res.headersSent)json(500,{error:'Unable to complete request.'});}
});
server.listen(Number(process.env.PORT??4173),'127.0.0.1',()=>{
  const address=server.address();
  if(address && typeof address==='object') console.log('ReleaseLens http://127.0.0.1:'+address.port);
});
