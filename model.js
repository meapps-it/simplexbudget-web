export const months=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
export const salaries=['Ordinario','Tredicesima','Premio','Straordinari'];
export const expenses=['Finanziamenti','Luce','Gas','Acqua','Affitto o mutuo','Condominio','Telefonia e Internet','Auto','Assicurazioni','Bollo','Carburante','Alimentari','Salute','Tasse','Altre spese'];
export const income=['Stipendio','Altre entrate'];
export const frequencies={1:'Mensile',2:'Bimestrale',3:'Trimestrale',12:'Annuale',0:'Una volta'};
export const people=['Totale','Tu','Moglie'];
const euro=new Intl.NumberFormat('it-IT',{useGrouping:'always',minimumFractionDigits:2,maximumFractionDigits:2});
export const money=value=>(value<0?'−':'')+'€ '+euro.format(Math.abs(value)/100);
export const signed=value=>value>0?'+'+money(value):money(value);
export const iso=(y,m,d)=>[y,String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-');
export function today(date=new Date()){return iso(date.getFullYear(),date.getMonth()+1,date.getDate());}
export function cents(value){
  const match=/^(\d{1,7})(?:[,.](\d{1,2}))?$/.exec(String(value).trim());
  return match?Number(match[1])*100+Number((match[2]||'').padEnd(2,'0')):0;
}
export const empty=()=>({version:1,movements:[],plans:[]});
export const id=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),byte=>byte.toString(16).padStart(2,'0')).join('');
export const validDate=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\d$/.test(value)&&value>='1900-01-01'&&value<='2199-12-31'&&new Date(value+'T00:00:00Z').toJSON()?.slice(0,10)===value;
export function totals(rows){
  let incoming=0,outgoing=0;
  for(const row of rows) if(row.type==='in') incoming+=row.amount; else outgoing+=row.amount;
  return {incoming,outgoing,balance:incoming-outgoing};
}
export const sum=rows=>rows.reduce((a,r)=>a+r.amount,0);
export const monthKey=(year,i)=>iso(year,i+1,1).slice(0,7);
export function monthly(rows,year,calc=sum){
  const grouped=Array.from({length:12},()=>[]);
  for(const r of rows) if(r.date.startsWith(String(year)+'-')) grouped[Number(r.date.slice(5,7))-1].push(r);
  return grouped.map(calc);
}
export const salaryRows=(rows,person)=>rows.filter(r=>r.type==='in'&&r.category==='Stipendio'&&(!person||r.person===person));
export function dueDate(plan,index){
  const [year,month,day]=plan.start.split('-').map(Number);
  const offset=month-1+index*plan.step;
  const targetYear=year+Math.floor(offset/12), targetMonth=offset%12+1;
  return iso(targetYear,targetMonth,Math.min(day,new Date(targetYear,targetMonth,0).getDate()));
}
export function occurrences(data,through){
  const paid=new Map(data.movements.filter(r=>r.link).map(r=>[r.link,r]));
  return data.plans.flatMap(plan=>{
    const rows=[];
    const limit=plan.count||(plan.step?3600:1);
    for(let i=0;i<limit;i++){
      const date=dueDate(plan,i);
      if(date>through)break;
      const key=plan.id+'@'+date;
      const payment=paid.get(key);
      if(!plan.closed||payment) rows.push({plan,date,key,payment,index:i});
    }
    return rows;
  }).sort((a,b)=>a.date.localeCompare(b.date));
}
export function togglePayment(data,occurrence,date=today()){
  const {plan,key,payment}=occurrence;
  if(payment)data.movements=data.movements.filter(r=>r.id!==payment.id);
  else data.movements.push({id:id(),type:'out',date,amount:plan.amount,category:plan.category,description:plan.description,notes:plan.notes,link:key});
}
const uid=value=>typeof value==='string'&&/^[a-zA-Z0-9-]{1,64}$/.test(value);
const amount=value=>Number.isSafeInteger(value)&&value>0&&value<=999999999;
const words=(value,max)=>typeof value==='string'&&value.length<=max;
export function validate(data){
  if(data?.version!==1||!Array.isArray(data.movements)||!Array.isArray(data.plans)||data.movements.length>50000||data.plans.length>500)throw Error('Formato dati non valido.');
  const plans=new Map();
  for(const p of data.plans){
    if(!p||!uid(p.id)||plans.has(p.id)||!validDate(p.start)||!amount(p.amount)||!expenses.includes(p.category)||!words(p.description,100)||!p.description.trim()||!words(p.notes,500)||![0,1,2,3,12].includes(p.step)||!Number.isInteger(p.count)||p.count<0||p.count>600||(!p.step&&p.count!==1)||(p.step&&p.count&&!validDate(dueDate(p,p.count-1)))||typeof p.closed!=='boolean')throw Error('Scadenza non valida.');
    plans.set(p.id,p);
  }
  const seen=new Set(),links=new Set();
  for(const r of data.movements){
    if(!r||!uid(r.id)||seen.has(r.id)||!validDate(r.date)||!amount(r.amount)||!['in','out'].includes(r.type)||!(r.type==='in'?income:expenses).includes(r.category)||!words(r.description,100)||!words(r.notes,500))throw Error('Movimento non valido.');
    if(r.category==='Stipendio'&&(![1,2].includes(r.person)||!salaries.includes(r.kind)))throw Error('Stipendio non valido.');
    if(r.link!=null){
      if(typeof r.link!=='string'||links.has(r.link)||r.type!=='out')throw Error('Pagamento collegato non valido.');
      const [planId,date,extra]=r.link.split('@'),p=plans.get(planId);
      if(!p||extra!==undefined||!validDate(date)||date<p.start)throw Error('Scadenza collegata non valida.');
      const monthDiff=(Number(date.slice(0,4))-Number(p.start.slice(0,4)))*12+Number(date.slice(5,7))-Number(p.start.slice(5,7));
      const index=p.step?monthDiff/p.step:0;
      if(!Number.isInteger(index)||(p.count&&index>=p.count)||dueDate(p,index)!==date)throw Error('Data di scadenza non valida.');
      links.add(r.link);
    }
    seen.add(r.id);
  }
  return data;
}
export function demo(year,month){
  const data=empty();
  for(const y of [year-1,year]){
    for(let m=1;m<=(y===year?month:12);m++){
      for(const person of [1,2]){
        const wave=[0,150,-50,260,20,410,-120,50,270,130,310,80][m-1];
        data.movements.push({id:id(),date:iso(y,m,10),type:'in',amount:(person===1?1580+wave:1150+wave/2)*100-(y===year?0:12000),category:'Stipendio',person,kind:m===12?'Tredicesima':'Ordinario',description:'Stipendio demo',notes:''});
      }
      for(const [category,value] of [['Alimentari',380],['Affitto o mutuo',680],['Luce',85+m*4],['Carburante',110],['Gas',50+(m%4)*25],['Telefonia e Internet',32]]){
        data.movements.push({id:id(),date:iso(y,m,15),type:'out',amount:value*100,category,description:category+' · demo',notes:''});
      }
    }
  }
  data.plans.push({id:id(),start:iso(year,month,25),step:1,count:8,amount:22500,category:'Finanziamenti',description:'Rata auto demo',notes:'Esempio di finanziamento',closed:false});
  data.plans.push({id:id(),start:iso(year,month,20),step:2,count:0,amount:7800,category:'Luce',description:'Bolletta luce demo',notes:'',closed:false});
  return data;
}
