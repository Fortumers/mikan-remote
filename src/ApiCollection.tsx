import {useEffect,useState} from 'react';
import {invoke,isTauri} from '@tauri-apps/api/core';
import Servers from './Servers';
type Row=Record<string,unknown>;
const object=(v:unknown):v is Row=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const safe=(k:string)=>!/token|secret|password|key|uuid|url|uri|link|subscription/i.test(k);
const labels:Record<string,string>={id:'ID',name:'Название',username:'Имя пользователя',state:'Состояние',status:'Статус',enabled:'Включено',online:'Онлайн',created_at:'Создано',expires_at:'Истекает',amount:'Сумма из API',currency:'Валюта',provider:'Провайдер',user_id:'ID пользователя'};
export default function ApiCollection({kind}:{kind:'users'|'nodes'|'payments'}){
 const [rows,setRows]=useState<Row[]|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[search,setSearch]=useState(''),[time,setTime]=useState('');
 async function load(){
  setBusy(true);setRows(null);setError('');setTime('');
  try{
   if(!isTauri())throw 'Откройте настольное приложение';
   const value=await invoke<unknown>('get_collection',{kind});
   const list=Array.isArray(value)?value:object(value)&&Array.isArray(value.items)?value.items:null;
   if(list===null||!list.every(object))throw 'Неожиданный формат списка. Нужна проверка схемы установленной версии Mikan.';
   setRows(list);setTime(new Date().toLocaleTimeString('ru-RU'));
  }catch(e){setError(typeof e==='string'?e:'Ошибка запроса')}finally{setBusy(false)}
 }
 useEffect(()=>{if(kind!=='nodes')void load()},[kind]);
 if(kind==='nodes')return <Servers/>;
 const columns=rows?[...new Set(rows.flatMap(r=>Object.keys(r)))].filter(k=>safe(k)&&rows.some(r=>r[k]!==null&&['string','number','boolean'].includes(typeof r[k]))):[];
 const filtered=rows?.filter(r=>columns.some(k=>String(r[k]??'').toLowerCase().includes(search.toLowerCase())))??[];
 return <section className="panel"><div className="row"><h2>Данные панели</h2><button disabled={busy} onClick={()=>void load()}>{busy?'Загрузка…':'Обновить список'}</button></div><p className="muted">Только чтение. Показан ответ одной страницы API: это не гарантия полного списка. Поиск работает только по загруженным строкам.</p>{time&&<p className="muted">Получено: {time} · строк: {rows?.length}</p>}{error&&<div className="error" role="alert">{error}</div>}{rows!==null&&<><input aria-label="Поиск в загруженных строках" placeholder="Поиск в загруженных строках…" value={search} onChange={e=>setSearch(e.target.value)}/><div className="table-wrap">{rows.length===0?<p>Панель вернула пустую страницу.</p>:columns.length===0?<p>Нет поддерживаемых полей для отображения.</p>:filtered.length===0?<p>Совпадений нет.</p>:<table><thead><tr>{columns.map(k=><th key={k}>{labels[k]??k}</th>)}</tr></thead><tbody>{filtered.map((r,i)=><tr key={i}>{columns.map(k=><td key={k}>{r[k]===null||r[k]===undefined?'Нет данных':typeof r[k]==='boolean'?(r[k]?'Да':'Нет'):typeof r[k]==='object'?'Составное поле':String(r[k])}</td>)}</tr>)}</tbody></table>}</div></>}{kind==='payments'&&<p className="muted">Суммы показаны в исходных единицах API. Конвертация валют и расчёт выручки пока не выполняются.</p>}<p className="muted">Поля со ссылками и названиями секретов скрыты, но таблица всё равно может содержать клиентские данные. Не публикуйте её.</p></section>;
}
