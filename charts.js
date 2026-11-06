import {money,months} from './model.js';
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const blue='#0979ed', coral='#ec6675', green='#189969', purple='#7756ce';
export const palette=[blue,coral,'#0e9d99',purple,'#cd7a07','#4c69bd','#289155','#b44883','#736242','#55667e'];
const monthLabels=months.map(m=>m.slice(0,3));
const point=(label,content)=>'<g role="button" tabindex="0" aria-label="'+esc(label)+'" data-point="'+esc(label)+'"><title>'+esc(label)+'</title>'+content+'</g>';
const legend=series=>'<div class="legend">'+series.map(s=>'<span><i style="background:'+s.color+'"></i>'+esc(s.name)+'</span>').join('')+'</div>';
function frame(body,labels,y,lo,hi){
  const w=350,left=48,right=340,spacing=(right-left)/labels.length;
  let grid='';
  for(let i=0;i<5;i++){
    const value=lo+(hi-lo)*i/4,py=y(value);
    grid+='<line x1="'+left+'" y1="'+py+'" x2="'+right+'" y2="'+py+'" stroke="#e2eaf4"/><text x="42" y="'+(py+3)+'" text-anchor="end">'+new Intl.NumberFormat('it-IT',{maximumFractionDigits:0}).format(value/100)+'</text>';
  }
  const text=labels.map((label,i)=>'<text x="'+(left+spacing*(i+.5))+'" y="153" text-anchor="middle">'+esc(label)+'</text>').join('');
  return '<svg class="chart" viewBox="0 0 '+w+' 162" role="group" aria-label="Grafico interattivo">'+grid+body+text+'</svg>';
}
function scale(values){
  const min=Math.min(0,...values),max=Math.max(0,...values);
  const step=Math.max(100,10**Math.floor(Math.log10((max-min||400)/4)));
  const lo=Math.floor(min/step)*step,hi=Math.max(lo+step,Math.ceil(max/step)*step);
  return {lo,hi,y:value=>133-(value-lo)*114/(hi-lo)};
}
const detail='<div class="chart-detail" aria-live="polite">Tocca il grafico per vedere gli importi.</div>';
export function line(title,current,prior,year){
  const last=Math.max(current.findLastIndex(v=>v>0),prior?.findLastIndex(v=>v>0)??-1);
  if(last<0)return '<section class="card"><h2>'+esc(title)+'</h2><p class="empty">Aggiungi uno stipendio per vedere il grafico.</p></section>';
  const length=Math.max(2,last+1);
  current=current.slice(0,length);
  prior=prior?.slice(0,length);
  const series=[{name:String(year),color:blue,values:current}];
  if(prior)series.push({name:String(year-1),color:purple,values:prior});
  const {lo,hi,y}=scale(series.flatMap(s=>s.values));
  const x=i=>48+(i+.5)*292/length;
  let body='';
  for(const [index,s] of series.entries()){
    let path='M '+x(0)+' '+y(s.values[0]);
    for(let i=1;i<s.values.length;i++){
      const mid=(x(i)+x(i-1))/2;
      path+=' C '+mid+' '+y(s.values[i-1])+' '+mid+' '+y(s.values[i])+' '+x(i)+' '+y(s.values[i]);
    }
    if(index===0)body+='<defs><linearGradient id="salary-fill" x1="0%" y1="0%" x2="0%" y2="100%" gradientUnits="objectBoundingBox"><stop stop-color="#a7d5ff" stop-opacity=".88"/><stop offset="1" stop-color="#dbeeff" stop-opacity=".30"/></linearGradient></defs><path d="'+path+' L '+x(s.values.length-1)+' '+y(0)+' L '+x(0)+' '+y(0)+' Z" fill="url(#salary-fill)"/>';
    body+='<path d="'+path+'" fill="none" stroke="'+s.color+'" stroke-width="2.7" '+(index?'stroke-dasharray="5 3"':'')+'/>';
    body+=s.values.map((v,i)=>'<circle cx="'+x(i)+'" cy="'+y(v)+'" r="3.5" stroke="'+s.color+'" stroke-width="2" fill="white"/>').join('');
  }
  body+=current.map((v,i)=>point(months[i]+' · '+year+' '+money(v)+(prior?' · '+(year-1)+' '+money(prior[i]):''),'<rect x="'+(x(i)-11)+'" y="13" width="22" height="125" fill="transparent"/>')).join('');
  return '<section class="card"><h2>'+esc(title)+'</h2>'+frame(body,monthLabels.slice(0,length),y,lo,hi)+legend(series)+detail+'</section>';
}
export function bars(title,series,labels=monthLabels,full=months){
  const {lo,hi,y}=scale(series.flatMap(s=>s.values));
  const spacing=292/labels.length,width=Math.min(34,spacing*.8/series.length);
  const body=labels.map((label,i)=>{
    const start=48+(i+.5)*spacing;
    const group=series.map((s,j)=>{
      const value=s.values[i],left=start+(j-series.length/2)*width;
      return '<rect x="'+left+'" y="'+Math.min(y(value),y(0))+'" width="'+(width-1)+'" height="'+Math.max(1,Math.abs(y(value)-y(0)))+'" rx="2" fill="'+s.color+'"/>';
    }).join('');
    return point(full[i]+' · '+series.map(s=>s.name+' '+money(s.values[i])).join(' · '),group+'<rect x="'+(start-spacing/2)+'" y="13" width="'+spacing+'" height="126" fill="transparent"/>');
  }).join('');
  return '<section class="card"><h2>'+esc(title)+'</h2>'+frame(body,labels,y,lo,hi)+legend(series)+detail+'</section>';
}
export const colors={blue,coral,green,purple};
export function donut(title,groups){
  const total=groups.reduce((acc,[,v])=>acc+v,0);
  if(!total)return '<section class="card"><h2>'+esc(title)+'</h2><p class="empty">Nessuna spesa nel periodo.</p></section>';
  let offset=0;
  const slices=groups.map(([label,v],i)=>{
    const pct=v/total*100,color=palette[i%palette.length],info=label+' · '+money(v)+' · '+pct.toLocaleString('it-IT',{maximumFractionDigits:1})+'%';
    const arc='<circle cx="65" cy="65" r="49" fill="none" pathLength="100" stroke="'+color+'" stroke-width="21" stroke-dasharray="'+pct+' '+(100-pct)+'" stroke-dashoffset="'+(-offset)+'" transform="rotate(-90 65 65)"/>';
    offset+=pct;
    return {arc:point(info,arc),button:'<button data-point="'+esc(info)+'"><i class="swatch" style="background:'+color+'"></i>'+esc(label)+'</button>'};
  });
  return '<section class="card"><h2>'+esc(title)+'</h2><div class="donut"><svg class="chart" viewBox="0 0 130 130" role="group" aria-label="Distribuzione spese">'+slices.map(s=>s.arc).join('')+'</svg><div class="list">'+slices.map(s=>s.button).join('')+'</div></div>'+detail+'</section>';
}
