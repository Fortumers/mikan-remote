import {useEffect,useRef,useState} from 'react';
import {invoke,isTauri} from '@tauri-apps/api/core';
import Servers from './Servers';
type Row=Record<string,unknown>;
const object=(v:unknown):v is Row=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const labels:Record<string,string>={id:'ID',name:'Пользователь',contact:'Контакт',username:'Имя пользователя',state:'Состояние',status:'Статус',enabled:'Включено',online:'Онлайн',created_at:'Создано',expires_at:'Подписка до',bound_devices:'Привязано устройств',device_limit:'Лимит устройств',hidden:'Скрыт в панели',amount:'Сумма (единицы API)',currency:'Валюта',provider:'Способ оплаты',user_id:'ID пользователя'};
const statuses:Record<string,string>={active:'Активен',expired:'Истёк срок',disabled:'Отключён',paid:'Оплачен',pending:'Ожидает',failed:'Ошибка',refunded:'Возвращён',cancelled:'Отменён'};
function display(k:string,v:unknown){
 if(v===null||v===undefined||v==='')return 'Не указано';
 if(typeof v==='boolean')return v?'Да':'Нет';
 if(k.endsWith('_at')&&typeof v==='string'){const d=new Date(v);return Number.isNaN(d.getTime())?'Некорректная дата':d.toLocaleString('ru-RU',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}
 if(typeof v==='object')return 'Составное поле';
 if((k==='state'||k==='status')&&typeof v==='string')return statuses[v]??v;
 return String(v);
}
function SimpleCollection({kind}:{kind:'users'|'payments'}){
 const [rows,setRows]=useState<Row[]|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[search,setSearch]=useState(''),[time,setTime]=useState(''),[selected,setSelected]=useState<Row|null>(null);
 const sequence=useRef(0);
 async function load(){
  const request=++sequence.current;setBusy(true);setRows(null);setSelected(null);setError('');setTime('');
  try{
   if(!isTauri())throw 'Откройте настольное приложение';
   const value=await invoke<unknown>('get_collection',{kind});
   const list=Array.isArray(value)?value:object(value)&&Array.isArray(value.items)?value.items:null;
   if(list===null||!list.every(object))throw 'Формат ответа панели не поддерживается. Требуется проверка версии API.';
   if(request===sequence.current){setRows(list);setTime(new Date().toLocaleTimeString('ru-RU'))}
  }catch(e){if(request===sequence.current)setError(typeof e==='string'?e:'Не удалось загрузить список')}finally{if(request===sequence.current)setBusy(false)}
 }
 useEffect(()=>{void load();return()=>{sequence.current++}},[kind]);
 const fields=kind==='users'?['id','name','contact','state','expires_at','bound_devices','device_limit']:['id','user_id','status','amount','currency','provider','created_at'];
 const details=kind==='users'?[...fields,'created_at','hidden']:fields;
 const columns=fields.filter(k=>k==='id'||rows?.some(r=>Object.prototype.hasOwnProperty.call(r,k)));
 const filtered=rows?.filter(r=>fields.some(k=>String(r[k]??'').toLowerCase().includes(search.toLowerCase())))??[];
 const heading=kind==='users'?'Пользователи':'История платежей';
 return <section className="collection-page"><div className="panel collection-toolbar"><div className="row"><div><h2>{heading}</h2><p className="muted">{time?`Обновлено ${time} · загружено записей: ${rows?.length}`:'Получение данных из панели'}</p></div><button disabled={busy} onClick={()=>void load()}>{busy?'Загрузка…':'Обновить'}</button></div><label className="sr-only" htmlFor={`search-${kind}`}>Поиск в загруженных записях</label><input id={`search-${kind}`} placeholder={kind==='users'?'Имя, контакт или ID…':'ID, статус или способ оплаты…'} value={search} onChange={e=>setSearch(e.target.value)}/><p className="muted hint">Поиск по загруженной странице. Полная загрузка всех страниц ещё не подключена.</p></div>{error&&<div className="error" role="alert">{error}</div>}{busy&&<div className="panel empty-state" role="status">Загружаем {kind==='users'?'пользователей':'платежи'}…</div>}{rows!==null&&<div className="panel collection-table"><div className="table-wrap">{rows.length===0?<div className="empty-state">Панель вернула пустой список.</div>:filtered.length===0?<div className="empty-state">Ничего не найдено. Попробуйте другой запрос.</div>:<table><thead><tr>{columns.map(k=><th key={k}>{labels[k]}</th>)}<th>Подробнее</th></tr></thead><tbody>{filtered.map((r,i)=><tr key={`${r.id??'row'}-${i}`}>{columns.map(k=><td key={k}>{k==='state'||k==='status'?<span className="badge">{display(k,r[k])}</span>:k==='name'?<span className="user-name">{display(k,r[k])}</span>:display(k,r[k])}</td>)}<td><button className="detail-button" onClick={()=>setSelected(r)} aria-label={`Открыть запись ${String(r.id??i+1)}`}>Открыть</button></td></tr>)}</tbody></table>}</div><p className="muted table-note">{filtered.length} из {rows.length} загруженных записей. Даты — в часовом поясе ПК.</p></div>}{selected&&<section className="panel record-detail" aria-label="Подробности выбранной записи"><div className="row"><h2>{kind==='users'?'Карточка пользователя':'Карточка платежа'} · {display('id',selected.id)}</h2><button onClick={()=>setSelected(null)}>Закрыть</button></div><dl className="detail-grid">{details.filter(k=>Object.prototype.hasOwnProperty.call(selected,k)).map(k=><div key={k}><dt className="muted">{labels[k]}</dt><dd>{display(k,selected[k])}</dd></div>)}</dl></section>}{kind==='payments'&&<p className="muted hint">Суммы отображаются в единицах панели. Пересчёт валют и итоговая выручка пока не подключены.</p>}<p className="muted hint">Только просмотр. Отсутствующая дата окончания не означает бессрочную подписку. Клиентские данные не публикуйте.</p></section>;
}
export default function ApiCollection({kind}:{kind:'users'|'nodes'|'payments'}){return kind==='nodes'?<Servers/>:<SimpleCollection key={kind} kind={kind}/>;}
