import Phaser from 'phaser';
import { battlefieldEncounters, authoredEncounters, runCatalog } from '../../../src/content/encounters';
import { desertRunCatalog } from '../../../src/content/desertCatalog';
import { resolveBattlefield } from '../../../src/domain/battlefield';
import { createBattle } from '../../../src/domain/turns';
import { previewMovement } from '../../../src/domain/grid';
import { BoardRenderer } from '../../../src/phaser/BoardRenderer';
import { bindBoardInput } from '../../../src/phaser/BoardInput';
import { contentLoadPlan, loadContentAssets } from '../../../src/phaser/contentLoading';

const status = document.querySelector<HTMLElement>('#status')!;
const gameElement = document.querySelector<HTMLElement>('#game')!;
const params = new URLSearchParams(location.search);
const encounter = authoredEncounters.find(e=>e.id===params.get('encounter'));
const fail = (message:string) => {status.textContent=`Error: ${message}`;gameElement.dataset.ready='false';};
class EncounterScene extends Phaser.Scene {
  create() {
    if (!encounter) {fail('Unknown encounter');return;}
    const generated=params.has('generated')?resolveBattlefield(battlefieldEncounters[0],Number(params.get('seed')??0),desertRunCatalog,{rejectCandidate:()=>params.has('fallback')}):null;
    if(generated&&!generated.ok){fail('Invalid generated battlefield');return;}
    const mapId=generated?.ok?generated.map.id:encounter.mapId;
    const catalog=contentLoadPlan(generated?.ok?{...desertRunCatalog,maps:{...desertRunCatalog.maps,[mapId]:generated.map}}:runCatalog);
    loadContentAssets(this,catalog,()=>{
      try {
        const result=createBattle(mapId,1,catalog);
        if(!result.ok) throw Error('Invalid initial state');
        const state=result.state;
        const activeId=state.initiative[state.activeIndex];
        const reach=previewMovement(state,activeId,catalog);
        if(!reach.ok) throw Error('Invalid movement preview');
        let selected: {x:number;y:number}|null=null;
        const render=()=>board.present(state,reach.cells.map(c=>c.cell),selected);
        const board=new BoardRenderer(this,catalog,mapId,cell=>{selected=cell;render();});
        render();
        const fit=()=>{const y=document.querySelector('#fit-panel')!.getBoundingClientRect().bottom;board.fit(this.scale.width,this.scale.height,{x:0,y,width:this.scale.width,height:this.scale.height-y});};
        fit();
        const input=bindBoardInput(this.game.canvas,{select:p=>board.select(p),pan:(x,y)=>board.pan(x,y),zoom:(factor,p)=>board.zoom(factor,p)},()=>({width:this.scale.width,height:this.scale.height}));
        this.scale.on('resize',fit);
        const departure=()=>this.game.destroy(true);
        window.addEventListener('pagehide',departure,{once:true});
        this.events.once('shutdown',()=>{this.scale.off('resize',fit);input();window.removeEventListener('pagehide',departure);});
        gameElement.dataset.fixture=JSON.stringify({encounter:encounter.id,mapId,battlefield:generated?.ok?generated.descriptor:null,diagnostics:generated?.ok?generated.diagnostics:null,seed:1,build:__BUILD_INFO__});
        status.textContent=encounter.id;gameElement.dataset.ready='true';
      } catch(e) {fail(e instanceof Error?e.message:'Fixture startup failed');}
    },fail);
  }
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',backgroundColor:'#172033',scale:{mode:Phaser.Scale.RESIZE,width:window.innerWidth,height:window.innerHeight},scene:EncounterScene});
