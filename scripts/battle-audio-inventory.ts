import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

export interface InventoryFile { path:string; bytes:number; gzipBytes:number; sha256:string }

export async function inventory(root:string, dir=root):Promise<InventoryFile[]> {
  const result:InventoryFile[]=[];
  for(const file of await readdir(dir,{withFileTypes:true})) {
    const path=join(dir,file.name);
    if(file.isDirectory())result.push(...await inventory(root,path));
    else {
      const bytes=await readFile(path);
      result.push({path:relative(root,path).replaceAll('\\','/'),bytes:bytes.length,
        gzipBytes:gzipSync(bytes).length,sha256:createHash('sha256').update(bytes).digest('hex')});
    }
  }
  return result;
}

export function cueBytes(files:readonly Pick<InventoryFile,'path'|'bytes'>[]):number {
  return files.filter(file=>file.path.replaceAll('\\','/').startsWith('audio/battle/')).reduce((sum,file)=>sum+file.bytes,0);
}
