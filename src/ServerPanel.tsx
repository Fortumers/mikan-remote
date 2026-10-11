import {useEffect,useRef,useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import ServerWorkspace from './ServerWorkspace';
import './users.css';
type Row=Record<string,unknown>;
const object=(v:unknown):v is Row=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const validId=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0;
export default function ServerPanel(){
 const [nodes,setNodes]=useState<Row[]>([]),[inbounds,setInbounds]=useState<Row[]>([]),[nodeId,setNodeId]=useState(''),[inboundId,setInboundId]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[review,setReview]=useState(false),[revision,setRevision]=useState(0);
 const alive=useRef(true),lock=useRef(false);
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false}},[]);
 async function read(kind:string){const value=await invoke<unknown>('get_server_catalog',{kind});if(!Array.isArray(value)||!value.every(object))throw 'Неподдерживаемая схема каталога';return value}
 async function load(){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setReview(false);setNodes([]);setInbounds([]);setNodeId('');setInboundId('');
  try{const [n,i]=await Promise.all([read('nodes'),read('inbounds')]);if(alive.current){setNodes(n);setInbounds(i);setRevision(v=>v+1)}}catch(e){if(alive.current)setError(typeof e==='string'?e:'Ошибка загрузки')}finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 const node=nodes.find(r=>String(r.id)===nodeId);
 const inbound=inbounds.find(r=>String(r.id)===inboundId&&r.node_id===node?.id);
 const selectable=!!node&&!!inbound&&validId(node.id)&&validId(inbound.id)&&typeof inbound.enabled==='boolean';
 async function save(){
  if(lock.current||!review||!selectable||!node||!inbound)return;
  lock.current=true;setBusy(true);setError('');setMessage('');
  try{await invoke('set_inbound_enabled',{nodeId:node.id,id:inbound.id,enabled:!inbound.enabled,expectedEnabled:inbound.enabled,confirmed:true});if(alive.current)setMessage('Панель приняла изменение. Обновите данные для проверки состояния.')}catch(e){if(alive.current)setError(typeof e==='string'?e:'Неизвестный результат: обновите данные перед повтором')}finally{lock.current=false;if(alive.current){setBusy(false);setReview(false);setNodes([]);setInbounds([]);setNodeId('');setInboundId('');setRevision(v=>v+1)}}
 }
 return <><div className="user-workspace"><div className="user-content"><section className="panel"><div className="row"><h2>Управление подключением</h2><button disabled={busy||review} onClick={()=>void load()}>{busy?'Выполняется…':'Обновить данные'}</button></div><p className="muted">Включение и отключение конкретного подключения в Mikan. Это не остановка процесса или всего сервера.</p>{error&&<div className="error" role="alert">{error}</div>}{message&&<p role="status">{message}</p>}<form onSubmit={e=>{e.preventDefault();if(selectable){setMessage('');setReview(true)}}}><label>Нода<select disabled={busy||review} value={nodeId} onChange={e=>{setNodeId(e.target.value);setInboundId('')}}><option value="">Выберите ноду</option>{nodes.filter(r=>validId(r.id)).map(r=><option key={String(r.id)} value={String(r.id)}>{typeof r.name==='string'?r.name:'Нода'} · ID {String(r.id)}</option>)}</select></label><label>Подключение<select disabled={busy||review||!node} value={inboundId} onChange={e=>setInboundId(e.target.value)}><option value="">Выберите подключение</option>{inbounds.filter(r=>node&&r.node_id===node.id&&validId(r.id)).map(r=><option key={String(r.id)} value={String(r.id)}>{typeof r.name==='string'?r.name:String(r.preset??'Подключение')} · ID {String(r.id)}</option>)}</select></label><p className="muted">{inbound?typeof inbound.enabled==='boolean'?`Состояние панели: ${inbound.enabled?'включено':'выключено'}`:'Панель не вернула поддерживаемое состояние; изменение недоступно.':'Выберите ноду и подключение.'}</p><button type="submit" disabled={busy||review||!selectable}>{inbound?.enabled===true?'Проверить отключение':'Проверить включение'}</button></form>{review&&node&&inbound&&<section aria-label="Подтверждение изменения подключения"><h3>{inbound.enabled?'Отключить':'Включить'} подключение?</h3><p>Нода: {String(node.name??'')} · ID {String(node.id)}</p><p>Подключение: {String(inbound.name??inbound.preset??'')} · ID {String(inbound.id)}</p><p className="muted">Отключение может прервать доступ использующих это подключение клиентов. Перед записью проверяем принадлежность ноде и исходное состояние; это не атомарная блокировка.</p><button disabled={busy} onClick={()=>void save()}>{busy?'Отправляем…':'Подтвердить изменение'}</button><button disabled={busy} onClick={()=>setReview(false)}>Отмена</button></section>}</section></div></div><ServerWorkspace key={revision}/></>;
}
