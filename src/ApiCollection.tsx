import {useEffect,useRef,useState} from 'react';
import {invoke,isTauri} from '@tauri-apps/api/core';
import Servers from './Servers';
import './collections.css';
type Row=Record<string,unknown>;
const object=(v:unknown):v is Row=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const labels:Record<string,string>={id:'ID',name:'Пользователь',contact:'Контакт',state:'Состояние',status:'Статус',created_at:'Создано',expires_at:'Подписка до',bound_devices:'Привязано устройств',device_limit:'Лимит устройств',hidden:'Скрыт в панели',amount:'Сумма (единицы API)',currency:'Валюта',provider:'Способ оплаты',user_id:'ID пользователя'};
const statuses:Record<string,string>={active:'Активен',expired:'Истёк срок',disabled:'Отключён',paid:'Оплачен',pending:'Ожидает',failed:'Ошибка',refunded:'Возвращён',cancelled:'Отменён'};
function display(k:string,v:unknown){
 if(v===null||v===undefined||v==='')return 'Не указано';
 if(typeof v==='boolean')return v?'Да':'Нет';
 if(k.endsWith('_at')&&typeof v==='string'){const d=new Date(v);return Number.isNaN(d.getTime())?'Некорректная дата':d.toLocaleString('ru-RU',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}
 if(typeof v==='object')return 'Составное поле';
 if((k==='state'||k==='status')&&typeof v==='string')return statuses[v]??v;
 return String(v);
}
function comparable(k:string,v:unknown):string|number|null{
 if(v===null||v===undefined||v==='')return null;
 if(k.endsWith('_at')){const n=typeof v==='string'?Date.parse(v):NaN;return Number.isFinite(n)?n:null}
 if(typeof v==='number')return Number.isFinite(v)?v:null;
 return typeof v==='string'?v:null;
}
function SimpleCollection({kind}:{kind:'users'|'payments'}){
 const [rows,setRows]=useState<Row[]|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[search,setSearch]=useState(''),[time,setTime]=useState(''),[selected,setSelected]=useState<Row|null>(null);
 const [status,setStatus]=useState(''),[sort,setSort]=useState({key:'id',direction:-1}),[page,setPage]=useState(1),[size,setSize]=useState(10);
 const sequence=useRef(0),detail=useRef<HTMLElement|null>(null);
 async function load(){
  const request=++sequence.current;setBusy(true);setRows(null);setSelected(null);setError('');setTime('');setPage(1);
  try{
   if(!isTauri())throw 'Откройте настольное приложение';
   const value=await invoke<unknown>('get_collection',{kind});
   const list=Array.isArray(value)?value:object(value)&&Array.isArray(value.items)?value.items:null;
   if(list===null||!list.every(object))throw 'Формат ответа панели не поддерживается. Требуется проверка версии API.';
   if(request===sequence.current){setRows(list);setTime(new Date().toLocaleTimeString('ru-RU'))}
  }catch(e){if(request===sequence.current)setError(typeof e==='string'?e:'Не удалось загрузить список')}finally{if(request===sequence.current)setBusy(false)}
 }
 useEffect(()=>{void load();return()=>{sequence.current++}},[kind]);
 useEffect(()=>{if(selected){detail.current?.scrollIntoView({block:'nearest'});detail.current?.focus({preventScroll:true})}},[selected]);
 const fields=kind==='users'?['id','name','contact','state','expires_at','bound_devices','device_limit']:['id','user_id','status','amount','currency','provider','created_at'];
 const details=kind==='users'?[...fields,'created_at','hidden']:fields;
 const columns=fields.filter(k=>k==='id'||rows?.some(r=>Object.prototype.hasOwnProperty.call(r,k)));
 const statusKey=kind==='users'?'state':'status';
 const choices=[...new Set((rows??[]).map(r=>r[statusKey]).filter((v):v is string=>typeof v==='string'&&v!==''))].sort();
 const query=search.trim().toLowerCase();
 const filtered=(rows??[]).filter(r=>(!status||r[statusKey]===status)&&fields.some(k=>String(r[k]??'').toLowerCase().includes(query)));
 const sorted=[...filtered].sort((a,b)=>{const x=comparable(sort.key,a[sort.key]),y=comparable(sort.key,b[sort.key]);if(x===null)return y===null?0:1;if(y===null)return -1;const n=typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),'ru',{numeric:true,sensitivity:'base'});return n*sort.direction});
 const pages=Math.max(1,Math.ceil(sorted.length/size)),current=Math.min(page,pages),visible=sorted.slice((current-1)*size,current*size);
 function reset(){setSearch('');setStatus('');setSort({key:'id',direction:-1});setPage(1);setSelected(null)}
 return <section className="collection-page"><div className="panel collection-toolbar"><div className="row"><div><h2>{kind==='users'?'Пользователи':'История платежей'}</h2><p className="muted">{time?`Обновлено ${time} · загружено записей: ${rows?.length}`:'Данные из панели'}</p></div><button disabled={busy} onClick={()=>void load()}>{busy?'Загрузка…':'Обновить'}</button></div><div className="collection-filters"><label>Поиск<input placeholder={kind==='users'?'Имя, контакт или ID…':'ID или способ оплаты…'} value={search} onChange={e=>{setSearch(e.target.value);setPage(1);setSelected(null)}}/></label>{choices.length>0&&<label>Состояние<select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);setSelected(null)}}><option value="">Все состояния</option>{choices.map(v=><option key={v} value={v}>{statuses[v]??v}</option>)}</select></label>}<button onClick={reset}>Сбросить</button></div><p className="muted hint">Фильтры и страницы работают по уже загруженному ответу. Другие страницы серверного API ещё не запрашиваются.</p></div>{error&&<div className="error" role="alert">{error}</div>}{busy&&<div className="panel empty-state" role="status">Загрузка записей…</div>}{rows!==null&&<div className="panel collection-table"><div className="table-wrap">{rows.length===0?<div className="empty-state">Панель вернула пустой список.</div>:sorted.length===0?<div className="empty-state">Ничего не найдено.<br/><button onClick={reset}>Сбросить фильтры</button></div>:<table><thead><tr>{columns.map(k=><th key={k} aria-sort={sort.key===k?(sort.direction===1?'ascending':'descending'):'none'}><button className="sort-button" onClick={()=>{setSort({key:k,direction:sort.key===k?-sort.direction:1});setPage(1)}}>{labels[k]}<span aria-hidden="true">{sort.key===k?(sort.direction===1?' ↑':' ↓'):' ↕'}</span></button></th>)}<th>Подробнее</th></tr></thead><tbody>{visible.map((r,i)=><tr key={`${r.id??'row'}-${i}`}>{columns.map(k=><td key={k}>{k===statusKey?<span className="badge">{display(k,r[k])}</span>:k==='name'?<span className="user-name">{display(k,r[k])}</span>:display(k,r[k])}</td>)}<td><button className="detail-button" onClick={()=>setSelected(r)} aria-label={`Открыть запись ${String(r.id??i+1)}`}>Открыть</button></td></tr>)}</tbody></table>}</div><div className="collection-pagination"><span className="muted">Найдено {sorted.length} из {rows.length} загруженных</span><label>Строк<select value={size} onChange={e=>{setSize(Number(e.target.value));setPage(1)}}>{[10,25,50].map(n=><option key={n} value={n}>{n}</option>)}</select></label><div className="pagination-buttons"><button disabled={current===1} onClick={()=>setPage(current-1)}>Назад</button><span aria-live="polite">{current} / {pages}</span><button disabled={current===pages} onClick={()=>setPage(current+1)}>Далее</button></div></div></div>}{selected&&<section ref={detail} tabIndex={-1} className="panel record-detail" aria-label="Подробности выбранной записи"><div className="row"><h2>{kind==='users'?'Карточка пользователя':'Карточка платежа'} · {display('id',selected.id)}</h2><button onClick={()=>setSelected(null)}>Закрыть</button></div><dl className="detail-grid">{details.filter(k=>Object.prototype.hasOwnProperty.call(selected,k)).map(k=><div key={k}><dt className="muted">{labels[k]}</dt><dd>{display(k,selected[k])}</dd></div>)}</dl></section>}{kind==='payments'&&<p className="muted hint">Суммы — в единицах панели. Валюты не пересчитываются, выручка не суммируется.</p>}<p className="muted hint">Только просмотр. Даты — в часовом поясе ПК. Отсутствие даты окончания не означает бессрочную подписку.</p></section>;
}
export default function ApiCollection({kind}:{kind:'users'|'nodes'|'payments'}){return kind==='nodes'?<Servers/>:<SimpleCollection key={kind} kind={kind}/>;}
