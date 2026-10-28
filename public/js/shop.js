const D=window.__S,S=D.site,PR=D.products,Q=s=>document.querySelector(s),QA=s=>[...document.querySelectorAll(s)],RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
const UI=k=>!S.ui||S.ui[k]!=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>(S.cur||'Rs')+' '+Math.round(+v||0).toLocaleString('en-PK');
const price=p=>p.sale>0?+p.sale:+p.price;
const gl=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}},sl=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const bag=c=>`<svg viewBox="0 0 200 200" role="img" aria-label="Bag"><defs><linearGradient id="g${c.slice(1)}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity=".65"/></linearGradient></defs><path d="M70 82V62a30 30 0 0 1 60 0v20" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round"/><rect x="36" y="78" width="128" height="98" rx="20" fill="url(#g${c.slice(1)})"/><rect x="47" y="89" width="106" height="76" rx="13" fill="none" stroke="#fff" stroke-opacity=".7" stroke-dasharray="4 4"/><circle cx="100" cy="114" r="9" fill="#ffe08a"/></svg>`;
const pimg=p=>(p.imgs&&p.imgs[0])||p.img||'';
const pic=p=>pimg(p)?`<img src="${esc(pimg(p))}" alt="${esc(p.name)}" loading="lazy" ${p.blend?'class="mul"':''}>`:bag(p.color||'#ff5fa2');
const savedCart=gl('bv_cart',[]),savedWish=gl('bv_wish',[]);
let cart=[],wish=Array.isArray(savedWish)?savedWish.filter(id=>PR.some(p=>p.id==id)):[];
if(Array.isArray(savedCart))savedCart.forEach(item=>{
 const p=item&&PR.find(product=>product.id==item.id),n=Number(item&&item.n);
 if(!p||!Number.isInteger(n)||n<1)return;
 const max=Math.min(20,Math.max(0,Number(p.stock)||0)),existing=cart.find(line=>line.id==p.id);
 if(max<1)return;
 if(existing)existing.n=Math.min(max,existing.n+n);else cart.push({id:p.id,n:Math.min(max,n)});
});
let cp=null,tt,ls=0,curCity='';
function zfee(c){let f=S.ship.fee||0;(S.ship.zones||[]).forEach(z=>{if(c&&z.city&&z.city.trim().toLowerCase()==c.trim().toLowerCase())f=+z.fee});return f}
const wa=t=>`https://wa.me/${String(S.wa||'').replace(/\D/g,'')}?text=${encodeURIComponent(t)}`;
const cardH=p=>{const u='/product/'+p.slug,n=esc(p.name),sale=p.sale>0,w=wish.includes(p.id);return `<article class="card rv0" data-tilt><button class="hrt ${w?'on':''}" data-hr="${p.id}" aria-label="Save ${n}" aria-pressed="${w}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg></button><a class="pic" href="${u}" style="--c:${esc(p.color||'#ff5fa2')}" aria-label="View ${n}">${pic(p)}${UI('badges')&&sale?'<span class="tag">Sale</span>':''}${UI('badges')&&p.best?'<span class="tag t2">Best seller</span>':''}${p.stock<1?'<span class="tag out">Sold out</span>':''}</a><div class="inf"><h3><a href="${u}">${n}</a></h3>${UI('cardcat')?`<p>${esc(p.cat)}</p>`:''}<div class="row"><b>${money(price(p))}</b>${sale?`<s>${money(p.price)}</s>`:''}${UI('cardadd')?`<button class="btn sm" data-a="${p.id}" ${p.stock<1?'disabled':''}>Add</button>`:''}</div></div></article>`};
/* ---------- Meta Pixel ---------- */
const M=S.meta||{on:{}},FB={view:'ViewContent',cart:'AddToCart',checkout:'InitiateCheckout',wa:'Contact',search:'Search',wish:'AddToWishlist',cat:'ViewCategory'};
const uid=()=>(window.crypto&&crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2,10));
const allowed=()=>!M.consent||localStorage.bv_consent=='1';
const tr=(k,d,id)=>{if(!(M.on&&M.on[k])||!allowed())return;const n=k=='buy'?(M.orderEv||'Purchase'):FB[k];id=id||uid();
 if(window.fbq)fbq(k=='cat'?'trackCustom':'track',n,d,{eventID:id});
 if(k!='buy'&&M.server!=0&&/^\d{6,20}$/.test(M.pixel||''))try{navigator.sendBeacon('/api?a=ev',JSON.stringify({n,id,d,u:location.href}))}catch(e){}};
const evP=(p,n=1)=>({content_ids:[p.id],content_type:'product',content_name:p.name,content_category:p.cat,contents:[{id:p.id,quantity:n}],value:price(p)*n,currency:'PKR'});
const evC=()=>({content_ids:cart.map(i=>i.id),content_type:'product',contents:cart.map(i=>({id:i.id,quantity:i.n})),num_items:cart.reduce((s,i)=>s+i.n,0),value:tot().t,currency:'PKR'});
function pixel(){const id=M.pixel||'';if(!/^\d{6,20}$/.test(id))return;
 const go=()=>{!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',id);if(/^\d{6,20}$/.test(M.pixel2||''))fbq('init',M.pixel2);fbq('track','PageView');if(window.__P){const p=PR.find(x=>x.id==__P);if(p)tr('view',evP(p))}};
 const c=localStorage.bv_consent;if(!M.consent||c=='1')return go();if(c=='0')return;
 const b=document.createElement('div');b.className='cons';b.innerHTML='<p>We use cookies and Meta Pixel to show relevant ads and measure results.</p><button class="btn sm" data-y>Accept</button><button class="ib" data-n>Decline</button>';document.body.appendChild(b);
 b.onclick=e=>{const y=e.target.dataset||{};if('y' in y||'n' in y){localStorage.bv_consent='y' in y?'1':'0';b.remove();if('y' in y)go()}}}
(()=>{const p=new URLSearchParams(location.search),s=['utm_source','utm_medium','utm_campaign','utm_content'].filter(x=>p.get(x)).map(x=>x.slice(4)+': '+p.get(x));if(p.get('fbclid'))s.push('fbclid');if(s.length)sessionStorage.bv_src=s.join(', ')})();
const src=()=>sessionStorage.bv_src||'';
/* ---------- effects ---------- */
function reveal(){const els=QA('main h2,.why div,.ct,details,blockquote,.card').filter(e=>!e.classList.contains('in'));
 els.forEach(e=>{e.classList.add('rv0');e.style.setProperty('--d',([...e.parentElement.children].indexOf(e)%4)*.09+'s')});
 if(!('IntersectionObserver' in window)){els.forEach(e=>e.classList.add('in'));return}
 const io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}}),{threshold:.1});els.forEach(e=>io.observe(e))}
function bump(){const c=Q('#cc');c.classList.remove('pop');void c.offsetWidth;c.classList.add('pop')}
function fly(el){const t=Q('#cb').getBoundingClientRect();if(!el||RM)return bump();const r=el.getBoundingClientRect(),d=document.createElement('i');d.className='fly';d.style.left=r.left+r.width/2-20+'px';d.style.top=r.top+r.height/2-20+'px';document.body.appendChild(d);
 d.animate([{transform:'translate(0,0) scale(1.2)',opacity:1},{transform:`translate(${t.left+t.width/2-r.left-r.width/2}px,${t.top+t.height/2-r.top-r.height/2}px) scale(.3)`,opacity:.5}],{duration:750,easing:'cubic-bezier(.55,-.2,.7,1)'}).onfinish=()=>{d.remove();bump()}}
function toast(m){const t=Q('#tst');t.innerHTML=`<span>${m}</span>`+(m=='Added to cart'?'<button class="ib" data-vc>View cart</button>':'');t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2800)}
addEventListener('scroll',()=>{const sp=Q('#sprog');if(sp)sp.style.transform=`scaleX(${scrollY/((document.documentElement.scrollHeight-innerHeight)||1)})`},{passive:true});
document.addEventListener('mousemove',e=>{
 const t=e.target.closest&&e.target.closest('[data-tilt]');QA('[data-tilt].on').forEach(x=>{if(x!==t){x.style.transform='';x.classList.remove('on')}});
 if(t&&UI('tilt')){const r=t.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;t.classList.add('on');t.style.transform=`perspective(800px) rotateY(${x*12}deg) rotateX(${-y*12}deg) translateY(-6px)`}
 if(RM)return;const h=e.target.closest&&e.target.closest('.hero');if(h){const r=h.getBoundingClientRect();h.style.setProperty('--mx',((e.clientX-r.left)/r.width-.5)*2);h.style.setProperty('--my',((e.clientY-r.top)/r.height-.5)*2)}
 if(matchMedia('(pointer:fine)').matches&&(!S.ui||S.ui.spk!=0)&&Date.now()-ls>70){ls=Date.now();const s=document.createElement('i');s.className='spk';s.style.left=e.clientX+'px';s.style.top=e.clientY+'px';s.style.background=['#ff5fa2','#a77bff','#ffb88a','#ffd84d'][Math.random()*4|0];document.body.appendChild(s);
  s.animate([{transform:'translate(-50%,-50%) scale(1) rotate(0)',opacity:.9},{transform:`translate(${(Math.random()-.5)*40-6}px,${Math.random()*40+10}px) scale(0) rotate(120deg)`,opacity:0}],{duration:800}).onfinish=()=>s.remove()}});
/* ---------- cart ---------- */
function save(){sl('bv_cart',cart);drawCart()}
function add(id,el){const p=PR.find(x=>x.id==id);if(!p)return;const max=Math.min(20,Math.max(0,Number(p.stock)||0)),i=cart.find(x=>x.id==id);if(max<1){toast('This bag is sold out');return}if(i){if(i.n>=max){toast('Maximum quantity reached');return}i.n++}else cart.push({id,n:1});save();tr('cart',evP(p));fly(el);toast('Added to cart')}
function tot(){let sub=0;cart.forEach(i=>{const p=PR.find(x=>x.id==i.id);if(p)sub+=price(p)*i.n});const d=cp?Math.round(sub*cp.pct/100):0,sh=sub&&sub-d<(S.ship.free||0)?zfee(curCity):0;return{sub,d,sh,t:sub-d+sh}}
function drawCart(){cart=cart.filter(i=>PR.some(p=>p.id==i.id));Q('#cc').textContent=cart.reduce((s,i)=>s+i.n,0);
 Q('#ci').innerHTML=cart.map(i=>{const p=PR.find(x=>x.id==i.id);return `<div class="ci"><div class="t" style="--c:${esc(p.color)}">${pic(p)}</div><div><b>${esc(p.name)}</b><br>${money(price(p))} x ${i.n}</div><button data-m="${i.id}" aria-label="Fewer">-</button><button data-p="${i.id}" aria-label="More">+</button></div>`}).join('')||'<p>Your cart is empty. Add a bag you love.</p>';
 const t=tot();Q('#tt').innerHTML=`<div class="sm2"><span>Subtotal</span><span>${money(t.sub)}</span></div>${cp?`<div class="sm2"><span>Coupon ${esc(cp.code)}</span><span>-${money(t.d)}</span></div>`:''}<div class="sm2"><span>Delivery</span><span>${t.sh?money(t.sh):'Free'}</span></div><div class="sm2" style="font:800 22px Fraunces,serif"><span>Total</span><span>${money(t.t)}</span></div>`;Q('#go').disabled=!cart.length||t.sub<(S.ship.min||0);if(S.ship.min&&t.sub<S.ship.min)Q('#tt').insertAdjacentHTML('beforeend',`<p>Minimum order is ${money(S.ship.min)}</p>`);Q('#ct').textContent='Total to pay on delivery: '+money(t.t)}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('button');if(!t){if(e.target.tagName==='DIALOG')e.target.close();return}const d=t.dataset||{};
 if(d.hr){const i=wish.indexOf(d.hr);i<0?wish.push(d.hr):wish.splice(i,1);sl('bv_wish',wish);if(i<0){const wp=PR.find(x=>x.id==d.hr);if(wp)tr('wish',evP(wp))}t.classList.toggle('on',i<0);t.setAttribute('aria-pressed',i<0);if(window.onWish)onWish();toast(i<0?'Saved to favourites':'Removed from favourites')}
 else if(d.a)add(d.a,(t.closest('.card')&&t.closest('.card').querySelector('.pic'))||Q('.pimg'));
 else if(d.g){const m=Q('#gm');if(m)m.src=d.g}
 else if('vc' in d)Q('#ds').classList.add('open');
 else if('down' in d)scrollBy({top:innerHeight*.92,behavior:RM?'auto':'smooth'});
 else if(d.m||d.p){const i=cart.find(x=>x.id==(d.m||d.p));if(!i)return;const p=PR.find(x=>x.id==i.id);if(!p)return;if(d.p&&i.n>=Math.min(20,Number(p.stock)||0)){toast('Maximum quantity reached');return}i.n+=d.p?1:-1;cart=cart.filter(x=>x.n>0);save()}
 else if('close' in d)t.closest('dialog').close();
 else if(t.id=='cb')Q('#ds').classList.add('open');else if(t.id=='dx')Q('#ds').classList.remove('open');
 else if(t.id=='bg'){const n=Q('#nv').classList.toggle('open');t.setAttribute('aria-expanded',n)}
 else if(t.id=='go'){tr('checkout',evC());Q('#ds').classList.remove('open');Q('#cd').showModal()}
});
document.addEventListener('click',e=>{if(e.target.closest('a[href^="https://wa.me"]'))tr('wa',{})});
QA('nav a').forEach(a=>a.onclick=()=>Q('#nv').classList.remove('open'));
Q('#cpf').onsubmit=async e=>{e.preventDefault();try{const r=await fetch('/api?a=coupon',{method:'POST',body:JSON.stringify({code:Q('#cpi').value})});const j=await r.json();if(j.ok){cp={code:j.code,pct:j.pct};toast('Coupon applied')}else{cp=null;alert(j.err)}}catch(x){alert('Could not check the coupon. Try again.')}drawCart()};
Q('#cy').oninput=e=>{curCity=e.target.value;drawCart()};
Q('#cf').onsubmit=async e=>{e.preventDefault();const b=Q('#cf button.btn');b.disabled=true;const f=new FormData(e.target),ev=evC();
 const body={items:cart,name:f.get('name'),phone:f.get('phone'),addr:f.get('addr')+', '+f.get('city'),note:f.get('note'),coupon:cp?cp.code:'',city:f.get('city'),hp:f.get('hp'),src:src()};
 try{const r=await fetch('/api?a=order',{method:'POST',body:JSON.stringify(body)}),j=await r.json();if(j.err){alert(j.err);return}
  const o=j.order;tr('buy',{...ev,value:o.total},o.id);cart=[];cp=null;save();Q('#cd').close();e.target.reset();Q('#ot').textContent=o.id;Q('#ow').href=wa(j.wa);Q('#od').showModal()}
 catch(x){alert('Could not send your order. Please try again or message us on WhatsApp.')}finally{b.disabled=false}};
/* ---------- boot ---------- */
if(Q('#wa'))Q('#wa').href=wa('Hi, I want to order a bag from '+S.name);
if(window.__P){const a=Q('#pwa');if(a)a.href=wa(a.dataset.t)}
QA('[data-hr]').forEach(b=>{if(wish.includes(b.dataset.hr)){b.classList.add('on');b.setAttribute('aria-pressed','true')}});
drawCart();pixel();reveal();
const pre=Q('#pre');if(pre)setTimeout(()=>pre.classList.add('out'),600);
