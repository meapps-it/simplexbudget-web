import {months,salaries,expenses,income,frequencies,people,money,signed,iso,today,cents,empty,id,totals,sum,monthly,salaryRows,dueDate,occurrences,togglePayment,validate,demo} from './model.js';
import {derive,seal,openVault,randomSalt} from './vault.js';
import {line,bars,donut,colors,esc} from './charts.js';
import {icon} from './icons.js';

const storageKey='simplexbudget.vault.v1';
const $=selector=>document.querySelector(selector);
const main=$('#main'),nav=$('#nav'),header=$('#header'),modal=$('#modal');
const now=today();
const state={page:'home',month:now.slice(0,7),year:Number(now.slice(0,4)),person:0,compare:false,salaryKind:'',period:'month',dueFilter:'open',filter:{type:'',category:'',q:'',from:'',to:''}};
let mode='locked',data=null,key=null,salt=null,busy=false,notice,installEvent,hiddenAt=0,storageError='';
const names={home:'Home',movements:'Movimenti',salary:'Stipendi',due:'Scadenze',charts:'Grafici',settings:'Impostazioni',report:'Report',categories:'Categorie'};
const navItems=[['home','home'],['movements','list'],['add','plus'],['charts','chart'],['settings','settings']];
const shortcutItems=[['salary','Stipendi','users','#0874e8'],['expenses','Spese','cart','#d84a5b'],['categories','Categorie','layers','#078b9e'],['due','Scadenze','calendar','#7954d7'],['charts','Grafici','chart','#276ce2'],['report','Report','file','#4a64df']];
const formatDate=value=>new Intl.DateTimeFormat('it-IT',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(value+'T00:00:00Z'));
const brand=()=>'<span class="brand"><span class="brand-icon">'+icon('wallet')+'</span>SimplexBudget</span>';
const button=(label,action,cls='secondary',extra='')=>'<button type="button" class="'+cls+'" data-act="'+action+'" '+extra+'>'+label+'</button>';
const iconButton=(label,symbol,action,mark=false)=>button(icon(symbol)+(mark?'<span class="dot"></span>':''),action,'icon-btn','aria-label="'+label+'"');
const options=(values,selected)=>values.map(v=>{const [value,label]=Array.isArray(v)?v:[v,v];return '<option value="'+esc(value)+'"'+(String(selected)===String(value)?' selected':'')+'>'+esc(label)+'</option>';}).join('');
const segments=(values,selected,action)=>'<div class="segments">'+values.map(([value,label])=>button(esc(label),action,String(selected)===String(value)?'active':'','data-value="'+esc(value)+'" aria-pressed="'+(String(selected)===String(value))+'"')).join('')+'</div>';
const field=(name,label,type,value='',extra='')=>'<label>'+label+'<input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+extra+'></label>';
const select=(name,label,values,value,extra='')=>'<label>'+label+'<select name="'+name+'" '+extra+'>'+options(values,value)+'</select></label>';
const dateField=(name,label,value)=>field(name,label,'date',value,'required min="1900-01-01" max="2199-12-31"');
const amountField=value=>field('amount','Importo (€)','text',value==null?'':(value/100).toFixed(2).replace('.',','),'required inputmode="decimal" maxlength="10" placeholder="0,00"');
const noteField=value=>'<label>Note<textarea name="notes" maxlength="500">'+esc(value)+'</textarea></label>';
const emptyView=msg=>'<p class="empty">'+msg+'</p>';
const metric=(label,value,symbol,cls='')=>'<div class="card metric '+cls+'"><div class="caption">'+(symbol?icon(symbol):'')+label+'</div><div class="value">'+value+'</div></div>';
const head=(title,tools='')=>'<div class="heading"><h1>'+title+'</h1>'+tools+'</div>';
const box=(title,content)=>'<section class="card stack"><h2>'+title+'</h2>'+content+'</section>';
const yearSelect=()=>'<label>Anno<select data-change="year">'+options(Array.from({length:300},(_,i)=>2199-i),state.year)+'</select></label>';
const monthInput=()=>button(months[Number(state.month.slice(5))-1]+' '+state.month.slice(0,4)+' ▾','choose-month','secondary month-button','aria-label="Mese del bilancio"');
const series=(name,color,values)=>({name,color,values});
const years=()=>[state.year-4,state.year-3,state.year-2,state.year-1,state.year].filter(y=>y>=1900);
const inYear=year=>data.movements.filter(r=>r.date.startsWith(String(year)+'-'));
const inMonth=()=>data.movements.filter(r=>r.date.startsWith(state.month));
const datesRange=period=>period==='year'?inYear(state.year):inMonth();
const categoryGroups=rows=>expenses.map(category=>[category,sum(rows.filter(r=>r.type==='out'&&r.category===category))]).filter(([,v])=>v).sort((a,b)=>b[1]-a[1]);
const descriptions=r=>r.description||r.category;
function notify(message){
  $('#toast').textContent=message;
  clearTimeout(notice);notice=setTimeout(()=>{$('#toast').textContent='';},3800);
}
function stored(){
  const raw=localStorage.getItem(storageKey);
  return raw?JSON.parse(raw):null;
}
function lock(){
  key=null;salt=null;data=null;mode='locked';state.page='home';
  if(modal.open)modal.close();
  render();
}
function go(page){
  if(page==='expenses'){
    state.filter={type:'out',category:'',q:'',from:state.month+'-01',to:monthEnd(state.month)};
    page='movements';
  } else if(page==='movements'){
    state.filter={type:'',category:'',q:'',from:'',to:''};
  }
  state.page=page;
  render();
  window.scrollTo(0,0);
  main.focus({preventScroll:true});
}
function monthEnd(value){
  const [y,m]=value.split('-').map(Number);
  return iso(y,m,new Date(y,m,0).getDate());
}
function lockView(){
  let box;
  try {box=stored();storageError='';} catch {storageError='Impossibile leggere l’archivio locale in questo browser.';}
  const existing=Boolean(box);
  return '<section class="card stack lock"><div class="brand-icon">'+icon('lock')+'</div><div><h1>'+(existing?'Apri il tuo bilancio':'Il bilancio di casa, in privato')+'</h1><p class="subtle">'+(existing?'Sblocca l’archivio con la tua password.':'Crea un archivio cifrato su questo dispositivo. Parti da un bilancio vuoto.')+'</p></div>'+
    (!isSecureContext?'<p class="error">Serve una connessione HTTPS oppure localhost per aprire l’archivio.</p>':'')+
    '<form class="form" data-form="unlock">'+field('password','Password','password','','required maxlength="256" autocomplete="'+(existing?'current-password':'new-password')+'" '+(existing?'':'minlength="10"'))+
    (existing?'':field('repeat','Ripeti password','password','','required minlength="10" maxlength="256" autocomplete="new-password"'))+
    '<p class="error" role="alert">'+esc(storageError)+'</p><button class="primary" '+(!isSecureContext||storageError?'disabled':'')+'>'+(existing?'Sblocca archivio':'Crea archivio personale')+'</button></form>'+
    '<p class="subtle">Conserva la password. L’archivio e i backup cifrati richiedono la password usata per crearli.</p>'+
    button('Prova con dati demo','demo')+
    (!existing&&isSecureContext&&!storageError?button('Ripristina un backup','import'):'')+'</section>';
}
function home(){
  const {incoming,outgoing,balance}=totals(inMonth());
  const ratio=incoming?Math.round(balance/incoming*1000)/10:0;
  const [year,month]=state.month.split('-').map(Number);
  const salary=monthly(salaryRows(data.movements,0),year);
  return '<div class="heading period"><span>Il nostro bilancio</span>'+monthInput()+'</div>'+
    '<section class="hero"><div class="row"><div><div class="caption">Disponibile · '+months[month-1]+'</div><div class="value">'+money(balance)+'</div></div>'+icon('coins','hero-icon')+'</div><div class="hero-foot"><div class="meter"><span style="width:'+Math.max(0,Math.min(100,ratio))+'%"></span></div><span>'+(incoming?ratio.toLocaleString('it-IT')+'% delle entrate':'Entrate da registrare')+'</span></div></section>'+
    '<div class="cols">'+metric('Entrate',money(incoming),'wallet','in')+metric('Uscite',money(outgoing),'cart','out')+'</div>'+
    line('Andamento stipendi (Totale)',salary,null,year)+
    '<div class="shortcuts">'+shortcutItems.map(([page,label,symbol,color])=>button(icon(symbol)+label,'go','card tile','data-page="'+page+'" style="--accent:'+color+'"')).join('')+'</div>';
}
function filtered(){
  const f=state.filter,needle=f.q.trim().toLocaleLowerCase('it');
  return data.movements.filter(r=>(!f.type||r.type===f.type)&&(!f.category||r.category===f.category)&&(!f.from||r.date>=f.from)&&(!f.to||r.date<=f.to)&&(!needle||[r.category,r.description,r.notes,r.kind,r.person&&people[r.person]].join(' ').toLocaleLowerCase('it').includes(needle))).sort((a,b)=>b.date.localeCompare(a.date));
}
function movementList(rows){
  if(!rows.length)return emptyView('Nessun movimento corrispondente.');
  return rows.map(r=>button('<span class="break"><strong>'+esc(descriptions(r))+'</strong><br><span class="meta">'+formatDate(r.date)+' · '+esc(r.category)+(r.category==='Stipendio'?' · '+people[r.person]+' · '+r.kind:'')+'</span></span><span class="amount '+(r.type==='in'?'pos':'neg')+'">'+(r.type==='in'?'+':'−')+money(r.amount)+'</span>','edit-movement','item','data-id="'+r.id+'"')).join('');
}
function movementResults(){
  const rows=filtered(),{incoming,outgoing}=totals(rows);
  return '<div class="row"><h2>'+rows.length+' moviment'+(rows.length===1?'o':'i')+'</h2><span class="meta">Saldo '+money(incoming-outgoing)+'</span></div>'+movementList(rows);
}
function movements(){
  const f=state.filter,categories=f.type==='in'?income:f.type==='out'?expenses:[...income,...expenses];
  return head('Movimenti',button('+ Nuovo','add','primary'))+
    '<section class="card form">'+field('q','Cerca','search',f.q,'data-change="q" placeholder="Descrizione, categoria o note"')+
    '<div class="cols">'+select('type','Tipo',[['','Tutti'],['in','Entrate'],['out','Uscite']],f.type,'data-change="type"')+select('category','Categoria',[['','Tutte'],...categories],f.category,'data-change="category"')+'</div>'+
    '<div class="cols">'+field('from','Dal','date',f.from,'data-change="from"')+field('to','Al','date',f.to,'data-change="to"')+'</div></section>'+
    '<div id="results" class="list">'+movementResults()+'</div>';
}
function salary(){
  const {year,person,compare,salaryKind}=state;
  const rows=salaryRows(data.movements,person).filter(r=>!salaryKind||r.kind===salaryKind);
  const current=monthly(rows,year),prior=monthly(rows,year-1);
  const total=current.reduce((a,v)=>a+v,0),priorTotal=prior.reduce((a,v)=>a+v,0),recorded=current.filter(v=>v>0).length;
  const received=current.map((v,i)=>[v,i]).filter(([v])=>v).reverse();
  const last=received[0];
  const monthDelta=last&&last[1]>0&&current[last[1]-1]?signed(last[0]-current[last[1]-1]):'—';
  return head('Stipendi',yearSelect())+
    segments(people.map((p,i)=>[i,p]),person,'person')+
    '<div class="cols">'+select('kind','Tipo stipendio',[['','Tutti'],...salaries],salaryKind,'data-change="salaryKind"')+
    select('compare','Confronto',[['off','Solo anno scelto'],['on','Con anno precedente']],compare?'on':'off','data-change="compare"')+'</div>'+
    line('Andamento stipendi – '+year,current,compare?prior:null,year)+
    '<div class="cols">'+metric('Totale annuale',money(total),'calendar')+metric('Media mesi registrati',recorded?money(Math.round(total/recorded)):'—','chart')+
    metric('Ultimo mese vs precedente',monthDelta)+metric('Differenza vs anno precedente',priorTotal?signed(total-priorTotal):'—')+'</div>'+
    box('Dettaglio mensile','<div class="list">'+(received.length?received.map(([v,i])=>button('<strong>'+months[i]+'</strong><span class="amount">'+money(v)+' ›</span>','salary-month','item','data-index="'+i+'"')).join(''):emptyView('Nessuno stipendio registrato per questi filtri.'))+'</div>');
}
function due(){
  const horizon=monthEnd(state.month);
  const upcoming=occurrences(data,horizon).filter(o=>state.dueFilter==='paid'?o.payment&&o.date.startsWith(state.month):state.dueFilter==='month'?o.date.startsWith(state.month):!o.payment);
  const plans=data.plans.filter(p=>!p.closed);
  return head('Scadenze',button('+ Nuova','add-plan','primary'))+
    '<div class="row"><p class="subtle">Le rate entrano nel saldo al momento del pagamento.</p>'+monthInput()+'</div>'+
    segments([['open','Da pagare'],['month','Tutte del mese'],['paid','Pagate']],state.dueFilter,'due-filter')+
    '<div class="list">'+(upcoming.length?upcoming.map(o=>{
      const badge=o.payment?'<span class="badge paid">Pagata</span>':o.date<today()?'<span class="badge late">Scaduta</span>':'<span class="badge">Da pagare</span>';
      return button('<span class="break"><strong>'+esc(o.plan.description)+'</strong><br><span class="meta">'+formatDate(o.date)+' · '+esc(o.plan.category)+(o.payment?' · Pagata il '+formatDate(o.payment.date):'')+'</span></span><span class="amount">'+money(o.payment?.amount??o.plan.amount)+'<br>'+badge+'</span>','occurrence','item','data-id="'+o.key+'"');
    }).join(''):emptyView('Nessuna scadenza in questa vista.'))+'</div>'+
    box('Piani attivi','<div class="list">'+(plans.length?plans.map(p=>{
      const paid=data.movements.filter(r=>r.link?.startsWith(p.id+'@')).length;
      const remaining=p.count?Math.max(0,p.count-paid):null;
      const detail=p.count?(p.step?remaining+' rate residue su '+p.count+' · Fine '+formatDate(dueDate(p,p.count-1)):remaining?'Singola scadenza':'Completata'):'Ricorrente senza termine';
      return button('<span class="break"><strong>'+esc(p.description)+'</strong><br><span class="meta">'+frequencies[p.step]+' · '+detail+'</span></span><span class="amount">'+money(p.amount)+' ›</span>','edit-plan','item','data-id="'+p.id+'"');
    }).join(''):emptyView('Aggiungi una bolletta, una rata o un’altra spesa.'))+'</div>');
}
function monthlyMetric(calc){
  return state.period==='year'?years().map(y=>calc(inYear(y))):monthly(data.movements,Number(state.month.slice(0,4)),calc);
}
function periodTools(){
  return segments([['month','Mensile'],['year','Annuale']],state.period,'period')+(state.period==='year'?yearSelect():monthInput());
}
function charts(){
  const labels=state.period==='year'?years().map(String):undefined;
  const graph=(title,s)=>bars(title,s,labels,labels);
  const selected=datesRange(state.period);
  const ofExpenses=categories=>rows=>sum(rows.filter(r=>r.type==='out'&&categories.includes(r.category)));
  return head('Grafici')+periodTools()+
    graph(state.period==='year'?'Entrate e uscite per anno':'Entrate e uscite per mese',[
      series('Entrate',colors.green,monthlyMetric(r=>totals(r).incoming)),
      series('Uscite',colors.coral,monthlyMetric(r=>totals(r).outgoing))])+
    donut('Distribuzione delle spese',categoryGroups(selected))+
    graph('Bollette pagate',[series('Luce',colors.blue,monthlyMetric(ofExpenses(['Luce']))),series('Gas',colors.coral,monthlyMetric(ofExpenses(['Gas']))),series('Acqua',colors.green,monthlyMetric(ofExpenses(['Acqua']))),series('Telefonia e Internet',colors.purple,monthlyMetric(ofExpenses(['Telefonia e Internet'])))])+
    graph('Finanziamenti pagati',[series('Finanziamenti',colors.purple,monthlyMetric(ofExpenses(['Finanziamenti'])))])+
    graph('Risparmio per periodo',[series('Saldo',colors.blue,monthlyMetric(r=>totals(r).balance))]);
}
function report(){
  const rows=datesRange(state.period),{incoming,outgoing,balance}=totals(rows);
  return head('Report')+periodTools()+
    '<div class="cols">'+metric('Entrate',money(incoming),'wallet','in')+metric('Uscite',money(outgoing),'cart','out')+'</div>'+
    metric('Saldo del periodo',money(balance),'coins')+
    box('Entrate da stipendi','<div class="list">'+[1,2].map(p=>'<div class="item"><span>'+people[p]+'</span><strong>'+money(sum(salaryRows(rows,p)))+'</strong></div>').join('')+'</div>')+
    box('Movimenti del periodo','<div class="list">'+movementList([...rows].sort((a,b)=>b.date.localeCompare(a.date)))+'</div>');
}
function categories(){
  const totalsByCategory=new Map(categoryGroups(inMonth()));
  return head('Categorie',monthInput())+box('Spese in comune','<div class="list">'+expenses.map(category=>button('<strong>'+esc(category)+'</strong><span class="amount">'+money(totalsByCategory.get(category)||0)+' ›</span>','category','item','data-value="'+esc(category)+'"')).join('')+'</div>');
}
function settings(){
  const personal=mode==='personal';
  return head('Impostazioni')+
    box('Archivio '+(personal?'personale':'demo'),'<p class="subtle">'+(personal?'Dati cifrati con la password e salvati in questo browser. L’archivio si blocca al riavvio della pagina o dopo cinque minuti in background.':'I dati demo sono fittizi. Le modifiche alla demo si azzerano quando esci.')+'</p>'+
      '<div class="actions">'+(personal?button('Blocca archivio','lock')+button('Esporta backup','export')+button('Importa backup','import'):button('Esci dalla demo','lock'))+'</div>')+
    box('Installa sul telefono','<p class="subtle">In Chrome su Android apri il menu ⋮ e scegli “Installa app” oppure “Aggiungi a schermata Home”. Apri la PWA online la prima volta.</p>'+(installEvent?button('Installa SimplexBudget','install','primary'):'')+
      '<div class="meta" id="offline-status"></div>');
}
const pages={home,movements,salary,due,charts,settings,report,categories};
function render(){
  main.className='stack';
  if(mode==='locked'){
    header.innerHTML=brand();
    nav.hidden=true;
    main.innerHTML=lockView();
    return;
  }
  const late=occurrences(data,today()).some(o=>!o.payment);
  header.innerHTML=(state.page==='home'?iconButton('Menu','menu','menu'):iconButton('Torna alla Home','back','go',false).replace('data-act="go"','data-act="go" data-page="home"'))+brand()+iconButton('Scadenze','bell','go',late).replace('data-act="go"','data-act="go" data-page="due"');
  nav.hidden=false;
  nav.innerHTML=navItems.map(([page,symbol])=>page==='add'?button(icon(symbol),'add','add','aria-label="Aggiungi movimento"'):button(icon(symbol)+names[page],'go',state.page===page?'active':'','data-page="'+page+'" '+(state.page===page?'aria-current="page"':''))).join('');
  main.innerHTML=(mode==='demo'?'<div class="demo row"><strong>MODALITÀ DEMO · Dati fittizi</strong>'+button('Esci','lock','')+'</div>':'')+pages[state.page]();
  offlineStatus();
}
function show(title,content){
  modal.innerHTML='<div class="row dialog-head"><h2 id="dialog-title">'+title+'</h2>'+iconButton('Chiudi','close','close')+'</div>'+content;
  modal.setAttribute('aria-labelledby','dialog-title');
  if(!modal.open)modal.showModal();
}
const formEnd=(label,extra='')=>'<p class="error" role="alert"></p><div class="actions"><button class="primary">'+label+'</button>'+extra+'</div>';
function movementForm(r,type=r?.type||'out',formValues={}){
  const linked=Boolean(r?.link);
  const v={...r,...formValues};
  const category=(type==='in'?income:expenses).includes(v.category)?v.category:(type==='in'?'Stipendio':'Alimentari');
  show(r?'Modifica movimento':'Nuovo movimento','<form class="form" data-form="movement" data-id="'+(r?.id||'')+'">'+
    (linked?'<p class="subtle">Pagamento collegato a una scadenza. Eliminandolo, la scadenza torna da pagare.</p>':'')+
    '<div class="cols">'+select('type','Tipo',[['out','Uscita'],['in','Entrata']],type,linked?'disabled':'data-change="movement-type"')+dateField('date','Data',v.date||today())+'</div>'+
    '<div class="cols">'+amountField(r?.amount)+select('category','Categoria',type==='in'?income:expenses,category,'data-change="movement-category"')+'</div>'+
    '<div class="cols" id="salary-fields" '+(category==='Stipendio'?'':'hidden')+'>'+select('person','Persona',[[1,people[1]],[2,people[2]]],v.person||1)+select('kind','Tipo stipendio',salaries,v.kind||salaries[0])+'</div>'+
    field('description','Descrizione','text',v.description,'maxlength="100"')+noteField(v.notes)+
    formEnd('Salva',r?button('Elimina','delete-movement','danger','data-id="'+r.id+'"'):'')+'</form>');
  if(formValues.amount!==undefined)modal.querySelector('[name=amount]').value=formValues.amount;
}
function planForm(p){
  const hasPayments=p&&data.movements.some(r=>r.link?.startsWith(p.id+'@'));
  const scheduleLock=hasPayments?'disabled':'required';
  show(p?'Modifica piano':'Nuova scadenza','<form class="form" data-form="plan" data-id="'+(p?.id||'')+'">'+
    field('description','Nome della spesa','text',p?.description,'required maxlength="100"')+
    '<div class="cols">'+amountField(p?.amount)+select('category','Categoria',expenses,p?.category||'Finanziamenti','data-change="plan-category"')+'</div>'+
    '<div class="cols">'+field('start','Prima scadenza','date',p?.start||today(),scheduleLock+' min="1900-01-01" max="2199-12-31"')+
    select('step','Frequenza',[[0,frequencies[0]],[1,frequencies[1]],[2,frequencies[2]],[3,frequencies[3]],[12,frequencies[12]]],p?.step??1,(hasPayments?'disabled':'data-change="plan-step"'))+'</div>'+
    '<label id="count-field" '+(p?.step===0?'hidden':'')+'>Numero di rate <span class="subtle" id="count-hint">'+((p?.category??'Finanziamenti')==='Finanziamenti'?'Obbligatorio per i finanziamenti.':'Lascia vuoto per ripetere senza termine.')+'</span><input name="count" type="number" min="1" max="600" value="'+(p?.step!==0&&p?.count?p.count:'')+'" '+(hasPayments?'disabled':'')+'></label>'+
    (hasPayments?'<p class="subtle">Data iniziale, frequenza e numero di rate sono bloccati perché il piano ha pagamenti registrati.</p>':'')+
    noteField(p?.notes)+formEnd('Salva',p?button(hasPayments?'Chiudi piano':'Elimina piano','delete-plan','danger','data-id="'+p.id+'"'):'')+'</form>');
}
function findOccurrence(k){
  const date=k.split('@')[1];
  return occurrences(data,date).find(o=>o.key===k);
}
function occurrenceForm(o){
  if(!o)return;
  show(esc(o.plan.description),'<form class="form" data-form="payment" data-id="'+o.key+'">'+
    '<p>Scadenza '+formatDate(o.date)+' · <strong>'+money(o.payment?.amount??o.plan.amount)+'</strong></p>'+
    (o.payment?'<p class="subtle">Registrata il '+formatDate(o.payment.date)+'. Annullando il pagamento, la relativa uscita viene eliminata.</p>':dateField('date','Data pagamento',today()))+
    formEnd(o.payment?'Annulla pagamento':'Segna pagata',o.payment?button('Modifica uscita','edit-movement','secondary','data-id="'+o.payment.id+'"'):'')+'</form>');
}
function importForm(){
  show('Ripristina backup','<form class="form" data-form="import"><p class="subtle">'+(mode==='personal'?'Il backup sostituirà l’archivio su questo dispositivo. Esporta prima una copia dei dati che vuoi conservare.':'Seleziona un backup cifrato di SimplexBudget.')+'</p>'+
    field('file','File di backup','file','','required accept=".json,application/json"')+
    field('password','Password del backup','password','','required maxlength="256" autocomplete="off"')+
    (mode==='personal'?'<label class="check"><input type="checkbox" required> Confermo la sostituzione dell’archivio locale.</label>':'')+
    formEnd('Ripristina')+'</form>');
}
function confirmDelete(kind,r){
  const closes=kind==='plan'&&data.movements.some(m=>m.link?.startsWith(r.id+'@'));
  show(closes?'Chiudi piano':kind==='plan'?'Elimina piano':'Elimina movimento',
    '<form class="form" data-form="delete-'+kind+'" data-id="'+r.id+'"><p>'+(closes?'Le rate già pagate restano nello storico. Le scadenze non pagate di questo piano verranno chiuse.':kind==='plan'?'Vuoi eliminare il piano e le sue scadenze?':r.link?'L’uscita sarà rimossa e la scadenza tornerà da pagare.':'Vuoi eliminare questo movimento?')+'</p>'+formEnd(closes?'Conferma chiusura':'Conferma eliminazione')+'</form>');
}
async function save(next){
  validate(next);
  if(mode==='personal'){
    const previous=localStorage.getItem(storageKey);
    const encrypted=JSON.stringify(await seal(next,key,salt));
    if(previous!==vaultSnapshot||localStorage.getItem(storageKey)!==previous)throw Error('Archivio cambiato in un’altra scheda. Bloccalo e riaprilo.');
    localStorage.setItem(storageKey,encrypted);
    vaultSnapshot=encrypted;
  }
  data=next;
}
let vaultSnapshot=null;
async function enter(next,newKey,newSalt,raw){
  data=next;key=newKey;salt=newSalt;vaultSnapshot=raw;mode='personal';go('home');
}
const formObject=form=>Object.fromEntries(new FormData(form));
function updateItem(list,item){
  const index=list.findIndex(r=>r.id===item.id);
  if(index<0)list.push(item);
  else list[index]=item;
}
function errorFor(form,message){
  const error=form.querySelector('.error');
  if(error)error.textContent=message;
}
async function submit(event){
  const form=event.target.closest('form[data-form]');
  if(!form)return;
  event.preventDefault();
  if(busy)return;
  busy=true;
  const submitter=form.querySelector('button:not([type])');
  if(submitter)submitter.disabled=true;
  errorFor(form,'');
  try{
    const action=form.dataset.form,v=formObject(form),recordId=form.dataset.id;
    if(action==='choose-month'){
      state.month=iso(Number(v.year),Number(v.month),1).slice(0,7);
      state.year=Number(v.year);
      modal.close();render();return;
    }
    if(action==='unlock'){
      const raw=localStorage.getItem(storageKey);
      const box=raw?JSON.parse(raw):null;
      if(!box&&v.password!==v.repeat)throw Error('Le password non coincidono.');
      const freshSalt=box?.salt||randomSalt();
      const newKey=await derive(v.password,freshSalt);
      let next=empty(),encrypted=raw;
      if(box){
        try{next=validate(await openVault(box,newKey));}catch{throw Error('Password errata o archivio danneggiato.');}
      }else{
        encrypted=JSON.stringify(await seal(next,newKey,freshSalt));
        if(localStorage.getItem(storageKey)!==raw)throw Error('L’archivio è cambiato. Ricarica la pagina.');
        localStorage.setItem(storageKey,encrypted);
      }
      await enter(next,newKey,freshSalt,encrypted);
      navigator.storage?.persist?.().catch(()=>{});
      return;
    }
    if(action==='import'){
      if(!v.file?.size||v.file.size>24_000_000)throw Error('Seleziona un backup fino a 24 MB.');
      const previous=localStorage.getItem(storageKey);
      let box,next,newKey;
      try{
        box=JSON.parse(await v.file.text());
        newKey=await derive(v.password,box.salt);
        next=validate(await openVault(box,newKey));
      }catch{throw Error('Backup non valido oppure password errata.');}
      const encrypted=JSON.stringify(box);
      if(localStorage.getItem(storageKey)!==previous||(mode==='locked'&&previous))throw Error('L’archivio è cambiato. Sbloccalo per importare il backup.');
      localStorage.setItem(storageKey,encrypted);
      modal.close();
      await enter(next,newKey,box.salt,encrypted);
      notify('Backup ripristinato. Usa la password del backup.');
      return;
    }
    const next=structuredClone(data);
    let message='Modifica salvata';
    if(action==='movement'){
      const previous=data.movements.find(r=>r.id===recordId);
      const type=previous?.link?'out':v.type;
      const amount=cents(v.amount);
      if(!amount)throw Error('Inserisci un importo positivo con al massimo due decimali.');
      const r={id:previous?.id||id(),type,date:v.date,amount,category:v.category,description:v.description.trim(),notes:v.notes.trim()};
      if(r.category==='Stipendio'){r.person=Number(v.person);r.kind=v.kind;}
      if(previous?.link)r.link=previous.link;
      updateItem(next.movements,r);
      message='Movimento salvato';
    }else if(action==='plan'){
      const previous=data.plans.find(r=>r.id===recordId);
      const step=Number(v.step??previous?.step);
      const count=step?Number(v.count??previous?.count??0):1;
      const amount=cents(v.amount);
      if(!amount)throw Error('Inserisci un importo positivo con al massimo due decimali.');
      if(v.category==='Finanziamenti'&&step&&!count)throw Error('Indica il numero di rate del finanziamento.');
      updateItem(next.plans,{id:previous?.id||id(),description:v.description.trim(),category:v.category,notes:v.notes.trim(),amount,start:v.start??previous?.start,step,count,closed:false});
      message='Piano salvato';
    }else if(action==='payment'){
      const occurrence=findOccurrence(recordId);
      if(!occurrence)throw Error('Scadenza non trovata.');
      togglePayment(next,occurrence,v.date);
      message=occurrence.payment?'Pagamento annullato':'Pagamento registrato';
    }else if(action==='delete-movement'){
      next.movements=next.movements.filter(r=>r.id!==recordId);
      message='Movimento eliminato';
    }else if(action==='delete-plan'){
      if(next.movements.some(r=>r.link?.startsWith(recordId+'@'))){
        next.plans.find(r=>r.id===recordId).closed=true;
        message='Piano chiuso';
      }else{
        next.plans=next.plans.filter(r=>r.id!==recordId);
        message='Piano eliminato';
      }
    }
    await save(next);
    modal.close();render();notify(message);
  }catch(error){errorFor(form,error.message||'Operazione non riuscita.');}
  finally{
    busy=false;
    if(submitter)submitter.disabled=false;
  }
}
function exportBackup(){
  const box=stored();
  if(!box)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(box)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='SimplexBudget-backup-'+today()+'.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  notify('Backup cifrato esportato');
}
function selectPoint(el){
  el.closest('.card').querySelector('.chart-detail').textContent=el.dataset.point;
}
document.addEventListener('click',async event=>{
  const point=event.target.closest('[data-point]');
  if(point){selectPoint(point);return;}
  const el=event.target.closest('[data-act]');
  if(!el||busy)return;
  const {act,page,id:recordId,value,index}=el.dataset;
  const record=data?.movements.find(r=>r.id===recordId);
  const plan=data?.plans.find(r=>r.id===recordId);
  switch(act){
    case 'go':go(page);break;
    case 'choose-month':
      show('Scegli il mese','<form class="form" data-form="choose-month"><div class="cols">'+
        select('month','Mese',months.map((name,i)=>[i+1,name]),Number(state.month.slice(5)))+
        select('year','Anno',Array.from({length:300},(_,i)=>2199-i),Number(state.month.slice(0,4)))+
        '</div>'+formEnd('Applica')+'</form>');
      break;
    case 'menu':show('Menu','<div class="list">'+Object.entries(names).map(([p,label])=>button(label,'menu-go','item','data-page="'+p+'"')).join('')+button(mode==='personal'?'Blocca archivio':'Esci dalla demo','lock')+'</div>');break;
    case 'menu-go':modal.close();go(page);break;
    case 'close':modal.close();break;
    case 'demo':mode='demo';data=demo(Number(now.slice(0,4)),Number(now.slice(5,7)));state.month=now.slice(0,7);state.year=Number(now.slice(0,4));go('home');break;
    case 'lock':lock();break;
    case 'add':movementForm();break;
    case 'edit-movement':if(record)movementForm(record);break;
    case 'delete-movement':if(record)confirmDelete('movement',record);break;
    case 'add-plan':planForm();break;
    case 'edit-plan':if(plan)planForm(plan);break;
    case 'delete-plan':if(plan)confirmDelete('plan',plan);break;
    case 'occurrence':occurrenceForm(findOccurrence(recordId));break;
    case 'person':state.person=Number(value);render();break;
    case 'period':state.period=value;render();break;
    case 'due-filter':state.dueFilter=value;render();break;
    case 'salary-month':{
      const month=Number(index);
      const rows=salaryRows(data.movements,state.person).filter(r=>r.date.startsWith(iso(state.year,month+1,1).slice(0,7))&&(!state.salaryKind||state.salaryKind===r.kind));
      const prior=sum(salaryRows(data.movements,state.person).filter(r=>r.date.startsWith(iso(state.year-1,month+1,1).slice(0,7))&&(!state.salaryKind||state.salaryKind===r.kind)));
      show(months[month]+' '+state.year,'<div class="stack"><p>Totale '+money(sum(rows))+(prior?' · Rispetto allo stesso mese dell’anno precedente '+signed(sum(rows)-prior):'')+'</p><div class="list">'+movementList(rows)+'</div></div>');break;
    }
    case 'category':go('expenses');state.filter.category=value;render();break;
    case 'export':exportBackup();break;
    case 'import':importForm();break;
    case 'install':
      if(installEvent){
        await installEvent.prompt();
        installEvent=null;render();
      }
      break;
  }
});
document.addEventListener('submit',submit);
document.addEventListener('change',event=>{
  const el=event.target;
  const action=el.dataset.change;
  if(!action)return;
  if(action==='movement-type'){
    movementForm(data.movements.find(r=>r.id===el.form.dataset.id),el.value,formObject(el.form));return;
  }
  if(action==='movement-category'){
    $('#salary-fields').hidden=el.value!=='Stipendio';return;
  }
  if(action==='plan-step'){$('#count-field').hidden=el.value==='0';return;}
  if(action==='plan-category'){
    $('#count-hint').textContent=el.value==='Finanziamenti'?'Obbligatorio per i finanziamenti.':'Lascia vuoto per ripetere senza termine.';return;
  }
  if(action==='year')state.year=Number(el.value);
  else if(action==='compare')state.compare=el.value==='on';
  else if(action==='salaryKind')state.salaryKind=el.value;
  else if(action in state.filter){
    state.filter[action]=el.value;
    if(action==='type')state.filter.category='';
  }
  if(action==='q')return;
  render();
});
document.addEventListener('input',event=>{
  if(event.target.dataset.change==='q'){
    state.filter.q=event.target.value;
    $('#results').innerHTML=movementResults();
  }
});
document.addEventListener('keydown',event=>{
  const point=event.target.closest('g[data-point]');
  if(point&&(event.key===' '||event.key==='Enter')){
    event.preventDefault();selectPoint(point);
  }
});
modal.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)hiddenAt=Date.now();
  else if(hiddenAt&&Date.now()-hiddenAt>300000&&mode==='personal'&&!busy)lock();
});
window.addEventListener('storage',event=>{
  if(event.key===storageKey&&mode==='personal'&&!busy){lock();notify('Archivio aggiornato da un’altra scheda.');}
});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installEvent=event;if(state.page==='settings')render();});
function offlineStatus(){
  const el=$('#offline-status');
  if(el)el.textContent=navigator.serviceWorker?.controller?'Uso offline pronto su questo dispositivo.':'Preparazione offline in corso o non disponibile in questo browser.';
}
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
  navigator.serviceWorker.addEventListener('controllerchange',offlineStatus);
}
render();
