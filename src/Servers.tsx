import {useEffect,useRef,useState} from 'react';
import {invoke,isTauri} from '@tauri-apps/api/core';
type NodeRow=Record<string,unknown>;
const object=(v:unknown):v is NodeRow=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const text=(v:unknown)=>typeof v==='string'&&v.trim()?v:'Нет данных';
const title=(r:NodeRow)=>typeof r.name==='string'&&r.name.trim()?r.name:typeof r.public_name==='string'&&r.public_name.trim()?r.public_name:`Нода ${typeof r.id==='number'?r.id:'без ID'}`;
const printable=(v:unknown)=>v===null||v===undefined?'Нет данных':typeof v==='boolean'?(v?'Да':'Нет'):typeof v==='object'?'Составное поле':String(v);
const fields=['id','name','public_name','host','domain','enabled'];
const labels:Record<string,string>={id:'ID',name:'Название',public_name:'Публичное имя',host:'Хост',domain:'Домен',enabled:'Включено в конфигурации'};
export default function Servers(){
 const [rows,setRows]=useState<NodeRow[]|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[search,setSearch]=useState(''),[updated,setUpdated]=useState('');
 const sequence=useRef(0);
 async function load(){
  const request=++sequence.current;setBusy(true);setError('');setRows(null);setUpdated('');
  try{
   if(!isTauri())throw 'Доступно только в настольном приложении';
   const data=await invoke<unknown>('get_collection',{kind:'nodes'});
   const list=Array.isArray(data)?data:object(data)&&Array.isArray(data.items)?data.items:null;
   if(list===null||!list.every(object))throw 'Неожиданный формат списка нод. Нужна проверка схемы этой версии Mikan.';
   if(request===sequence.current){setRows(list);setUpdated(new Date().toLocaleTimeString('ru-RU'))}
  }catch(e){if(request===sequence.current)setError(typeof e==='string'?e:'Не удалось получить серверы')}finally{if(request===sequence.current)setBusy(false)}
 }
 useEffect(()=>{void load();return()=>{sequence.current++}},[]);
 const filtered=rows?.filter(r=>[title(r),String(r.id??'')].some(v=>v.toLowerCase().includes(search.toLowerCase())))??[];
 return <section><div className="panel" style={{marginBottom:20}}><div className="row"><h2>Ноды Mikan</h2><button disabled={busy} onClick={()=>void load()}>{busy?'Загрузка…':'Обновить серверы'}</button></div><p className="muted">Только чтение. Включение в конфигурации не доказывает сетевую доступность.</p><input aria-label="Поиск серверов" placeholder="Поиск по названию или ID…" value={search} onChange={e=>setSearch(e.target.value)}/>{updated&&<p className="muted">Получено: {updated} · загружено нод: {rows?.length}. Показан текущий ответ API.</p>}{error&&<div className="error" role="alert">{error}</div>}{busy&&<p role="status">Получаем список серверов…</p>}</div>{rows!==null&&rows.length===0&&<div className="panel">Панель вернула пустой список нод.</div>}{rows!==null&&rows.length>0&&filtered.length===0&&<div className="panel">Совпадений нет.</div>}<div className="server-grid">{filtered.map((r,i)=><article className="panel" key={`${r.id??'node'}-${i}`}><div className="row"><h3>{title(r)}</h3><span className={r.enabled===true?'badge good':r.enabled===false?'badge bad':'badge'}>{r.enabled===true?'Включено':r.enabled===false?'Выключено':'Статус конфигурации неизвестен'}</span></div><p className="muted">ID: {printable(r.id)}</p><p>Доступность: не проверена</p><p className="muted">Нагрузка и история трафика пока не подключены.</p><details><summary style={{cursor:'pointer',color:'#fb923c'}}>Подробности ноды</summary><dl>{fields.map(k=><div key={k} style={{marginTop:12}}><dt className="muted">{labels[k]}</dt><dd style={{margin:'4px 0',overflowWrap:'anywhere'}}>{k==='host'||k==='domain'?text(r[k]):printable(r[k])}</dd></div>)}</dl><p className="muted">Показаны только разрешённые поля. Ключи и конфигурации не выводятся. Адреса серверов не публикуйте.</p></details></article>)}</div></section>;
}
