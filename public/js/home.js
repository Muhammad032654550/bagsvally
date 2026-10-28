if(document.querySelector('#grid')){
let cat='All',q='',so='f';
const chips=()=>{const el=Q('#chips');if(!el)return;const c=['All',...(S.cats||[]).filter(x=>x.filter!==0&&x.filter!=='0'&&x.filter!==false).map(x=>x.n),...(UI('wish')?['__w']:[])];el.innerHTML=c.map(x=>`<button class="chip ${x==cat?'on':''}" data-c="${esc(x)}">${x=='__w'?'Saved ('+wish.length+')':esc(x)}</button>`).join('')};
const list=()=>{let l=PR.filter(p=>(cat=='All'||(cat=='__w'?wish.includes(p.id):p.cat==cat))&&p.name.toLowerCase().includes(q));if(so=='lo')l.sort((a,b)=>price(a)-price(b));if(so=='hi')l.sort((a,b)=>price(b)-price(a));return l};
function grid(){Q('#grid').innerHTML=list().map(cardH).join('')||'<p>No bags match your search. Try another word or category.</p>';reveal()}
window.onWish=()=>{chips();if(cat=='__w')grid()};
document.addEventListener('click',e=>{const t=e.target.closest('[data-c]');if(t){cat=t.dataset.c;if(cat!='All'&&cat!='__w')tr('cat',{content_category:cat});chips();grid();Q('#shop').scrollIntoView({behavior:RM?'auto':'smooth'})}});
let sT;if(Q('#q'))Q('#q').oninput=e=>{q=e.target.value.toLowerCase();grid();clearTimeout(sT);sT=setTimeout(()=>{if(q.length>1)tr('search',{search_string:q})},900)};if(Q('#so'))Q('#so').onchange=e=>{so=e.target.value;grid()};
chips();
window.chips=chips;window.grid=grid;
}
