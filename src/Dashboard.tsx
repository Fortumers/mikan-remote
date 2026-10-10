import {useEffect,useRef,useState} from 'react';
import {invoke,isTauri} from '@tauri-apps/api/core';
import {AreaChart,Area,XAxis,YAxis,Tooltip,ResponsiveContainer,CartesianGrid} from 'recharts';
import {RefreshCw} from 'lucide-react';
type Row=Record<string,unknown>;
type Point={t:string;timestamp:number;gb:number};
type Block<T>={data:T|null;error:string};
const object=(v:unknown):v is Row=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const numeric=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const count=(v:unknown)=>numeric(v)&&Number.isSafeInteger(v)?v.toLocaleString('ru-RU'):'Нет данных';
const gb=(v:unknown)=>numeric(v)?`${(v/1e9).toLocaleString('ru-RU',{maximumFractionDigits:2})} ГБ`:'Нет данных';
const percent=(v:unknown)=>numeric(v)&&v<=100?`${v.toLocaleString('ru-RU',{maximumFractionDigits:1})}%`:'Нет данных';
const empty=<T,>():Block<T>=>({data:null,error:''});
function points(v:unknown):Point[]{
 if(!object(v)||!Array.isArray(v.points))throw 'Неподдерживаемый формат истории трафика';
 return v.points.map(p=>{if(!object(p)||typeof p.t!=='string'||!Number.isFinite(Date.parse(p.t))||!numeric(p.up)||!numeric(p.down)||!Number.isFinite(p.up+p.down))throw 'Некорректная точка истории трафика';return {t:p.t,timestamp:Date.parse(p.t),gb:(p.up+p.down)/1e9}}).sort((a,b)=>a.timestamp-b.timestamp);
}
export default function Dashboard({onSettings,onServers}:{onSettings:()=>void;onServers:()=>void}){
 const [overview,setOverview]=useState<Block<Row>>(empty),[traffic,setTraffic]=useState<Block<Point[]>>(empty),[nodes,setNodes]=useState<Block<Row[]>>(empty);
 const [busy,setBusy]=useState(false),[updated,setUpdated]=useState(''),[auto,setAuto]=useState(false);
 const alive=useRef(true),running=useRef(false);
 async function refresh(){
  if(running.current)return;
  running.current=true;setBusy(true);setOverview(empty());setTraffic(empty());setNodes(empty());setUpdated('');
  if(!isTauri()){const error='Откройте настольное приложение';setOverview({data:null,error});setTraffic({data:null,error});setNodes({data:null,error});running.current=false;setBusy(false);return}
  async function read<T>(command:string,args:Record<string,unknown>,parse:(v:unknown)=>T):Promise<Block<T>>{try{return {data:parse(await invoke<unknown>(command,args)),error:''}}catch(e){return {data:null,error:typeof e==='string'?e:'Ошибка загрузки'}}}
  const [o,t,n]=await Promise.all([
   read('get_overview',{},v=>{if(!object(v))throw 'Неподдерживаемый формат сводки';return v}),
   read('get_traffic',{},points),
   read('get_collection',{kind:'nodes'},v=>{const list=Array.isArray(v)?v:object(v)&&Array.isArray(v.items)?v.items:null;if(!list||!list.every(object))throw 'Неподдерживаемый формат списка серверов';return list})
  ]);
  if(alive.current){setOverview(o);setTraffic(t);setNodes(n);setUpdated(new Date().toLocaleTimeString('ru-RU'));setBusy(false)}
  running.current=false;
 }
 useEffect(()=>{alive.current=true;void refresh();return()=>{alive.current=false}},[]);
 useEffect(()=>{if(!auto)return;const timer=window.setInterval(()=>void refresh(),30000);return()=>window.clearInterval(timer)},[auto]);
 const rows=nodes.data;
 const available=rows?.filter(r=>r.status==='ok').length;
 const bytes=traffic.data?.reduce((sum,p)=>sum+p.gb*1e9,0);
 const cards=[{label:'Пользователи',value:count(overview.data?.users_total),note:'Всего в панели'},{label:'Активные пользователи',value:count(overview.data?.users_active),note:'По состоянию Mikan'},{label:'Трафик за период',value:gb(bytes),note:'Сумма точек графика · до 7 дней'},{label:'Доступные ноды',value:rows?`${available} / ${rows.length}`:'Нет данных',note:'По последнему состоянию панели'}];
 const generated=typeof overview.data?.generated_at==='string'?Date.parse(overview.data.generated_at):NaN;
 return <section className="live-dashboard"><header><div><p className="eyebrow">ОБЗОР СЕРВИСА</p><h1>Главная</h1></div><div className="dashboard-actions"><label><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/>Обновлять каждые 30 с</label><button disabled={busy} onClick={()=>void refresh()}><RefreshCw size={16}/>{busy?'Загрузка…':'Обновить'}</button></div></header><p className="muted hint">{busy?'Получаем данные панели…':updated?`Запросы завершены в ${updated}`:'Данные не загружены'}{Number.isFinite(generated)?` · Сводка сформирована ${new Date(generated).toLocaleString('ru-RU')}`:''}</p>{overview.error&&<div className="error" role="alert">Сводка: {overview.error} <button onClick={onSettings}>Настройки подключения</button></div>}<section className="stats">{cards.map(c=><article className="panel stat" key={c.label}><span className="muted">{c.label}</span><strong>{c.value}</strong><small>{c.note}</small></article>)}</section><section className="panel chart"><div className="row"><h2>Потребление трафика</h2><span className="muted">Последние 7 дней · ГБ</span></div>{traffic.error?<div className="error" role="alert">{traffic.error}</div>:busy?<div className="empty-state" role="status">Загружаем историю трафика…</div>:traffic.data?.length?<><ResponsiveContainer width="100%" height={280}><AreaChart data={traffic.data} margin={{top:20,right:12,left:0,bottom:10}}><defs><linearGradient id="live-traffic-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fb923c" stopOpacity={0.35}/><stop offset="100%" stopColor="#fb923c" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid stroke="#2b3543" vertical={false}/><XAxis dataKey="timestamp" type="number" domain={['dataMin','dataMax']} scale="time" stroke="#8f9eb4" tickFormatter={v=>new Date(Number(v)).toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'})} minTickGap={35}/><YAxis stroke="#8f9eb4" width={50}/><Tooltip labelFormatter={v=>new Date(Number(v)).toLocaleString('ru-RU')} contentStyle={{background:'#141a23',border:'1px solid #334155',borderRadius:10}}/><Area dataKey="gb" name="Трафик, ГБ" type="linear" stroke="#fb923c" strokeWidth={3} fill="url(#live-traffic-fill)" isAnimationActive={false}/></AreaChart></ResponsiveContainer><p className="muted hint">Входящий + исходящий трафик. Показаны только точки, возвращённые панелью; пропущенные интервалы не заменяются нулём. 1 ГБ = 1 000 000 000 байт.</p></>:<div className="empty-state">История трафика пуста.</div>}</section><div className="row section-heading"><h2>Серверы</h2><button onClick={onServers}>Все серверы</button></div>{nodes.error&&<div className="error" role="alert">Серверы: {nodes.error}</div>}{busy&&<div className="panel empty-state" role="status">Загружаем серверы…</div>}{rows&&rows.length===0&&<div className="panel empty-state">Ноды не найдены.</div>}<div className="server-grid">{rows?.map((r,i)=>{const ok=r.status==='ok';const cpu=ok&&numeric(r.cpu_percent)&&r.cpu_percent<=100?r.cpu_percent:null;const memory=ok&&numeric(r.mem_used)&&numeric(r.mem_total)&&r.mem_total>0&&r.mem_used<=r.mem_total?`${(r.mem_used/1e9).toLocaleString('ru-RU',{maximumFractionDigits:1})} / ${(r.mem_total/1e9).toLocaleString('ru-RU',{maximumFractionDigits:1})} ГБ`:null;return <article className="panel" key={`${r.id??'node'}-${i}`}><div className="row"><h3>{typeof r.name==='string'?r.name:`Нода ${i+1}`}</h3><span className={ok?'badge good':r.status==='error'?'badge bad':'badge'}>{ok?'Доступна':r.status==='error'?'Ошибка связи':'Не проверена'}</span></div><p className="muted">ID: {count(r.id)} · {r.enabled===true?'Включена':r.enabled===false?'Выключена':'Настройка неизвестна'}</p><div className="row"><span>CPU сервера</span><span>{percent(cpu)}</span></div>{cpu!==null&&<div className="meter"><div style={{width:`${cpu}%`}}/></div>}<div className="row node-metric"><span>Память</span><span>{memory??'Нет данных'}</span></div><div className="row node-metric"><span>Соединения</span><span>{ok?count(r.conns):'Нет данных'}</span></div><p className="muted hint">Последнее состояние по данным панели, не прямой опрос ноды приложением.</p></article>})}</div><footer>Только реальные данные Mikan · Нет подстановки демонстрационных показателей</footer></section>;
}
