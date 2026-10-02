// Local development server. No packages, build step, or bundler required.
const http=require('node:http');const fs=require('node:fs');const path=require('node:path');
const root=__dirname,port=Number(process.env.PORT)||8080;
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end('Bad request');return;}
  const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
  fs.readFile(target,(error,data)=>{if(error){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);});
});
server.listen(port,'127.0.0.1',()=>console.log(`INVADERS ready at http://127.0.0.1:${port}`));
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
