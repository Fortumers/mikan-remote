import {useEffect,useRef,useState} from 'react';
import {invoke,isTauri} from '@tauri-apps/api/core';
import ApiCollection from './ApiCollection';
type Tariff={id:number;name:string};
const record=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
export default function UserManagement(){
 const [tariffs,setTariffs]=useState<Tariff[]>([]),[name,setName]=useState(''),[contact,setContact]=useState(''),[tariffId,setTariffId]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(''),[review,setReview]=useState(false),[revision,setRevision]=useState(0);
 const lock=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 async function load(){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setTariffs([]);setTariffId('');setReview(false);
  try{if(!isTauri())throw 'Откройте настольное приложение';const data=await invoke<unknown>('get_tariffs');if(!Array.isArray(data))throw 'Неподдерживаемая схема тарифов';const list=data.filter(t=>record(t)&&t.archived!==true&&t.archived!==1).map(t=>{if(!record(t)||typeof t.id!=='number'||!Number.isSafeInteger(t.id)||t.id<1||typeof t.name!=='string')throw 'Некорректный тариф в ответе API';return {id:t.id,name:t.name}});if(alive.current)setTariffs(list)}catch(e){if(alive.current)setError(typeof e==='string'?e:'Ошибка загрузки тарифов')}finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 useEffect(()=>{void load()},[]);
 const selected=tariffs.find(t=>String(t.id)===tariffId);
 const valid=!!name.trim()&&Array.from(name.trim()).length<=100&&Array.from(contact.trim()).length<=100&&!!selected;
 async function create(){
  if(lock.current||!review||!valid||!selected)return;lock.current=true;setBusy(true);setError('');setSuccess('');
  try{await invoke('create_user',{name:name.trim(),contact:contact.trim(),tariffId:selected.id,confirmed:true});if(alive.current){setSuccess('Панель подтвердила создание пользователя. Список обновляется.');setName('');setContact('');setReview(false);setRevision(v=>v+1)}}catch(e){if(alive.current){setError(typeof e==='string'?e:'Неизвестный результат операции: проверьте список перед повтором');setReview(false)}}finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 return <><section className="panel" style={{marginBottom:20}}><div className="row"><h2>Создать пользователя</h2><button disabled={busy} onClick={()=>void load()}>Обновить тарифы</button></div><p className="muted">Создание по тарифу Mikan. Лимиты трафика, устройств и срок берутся из тарифа. Изменение существующего пользователя и отдельное назначение ГБ пока не добавлены.</p><p className="muted">Нужен API-ключ с правами записи. Не повторяйте запрос автоматически при потере ответа.</p>{error&&<div className="error" role="alert">{error}</div>}{success&&<p role="status">{success}</p>}<form onSubmit={e=>{e.preventDefault();if(valid){setSuccess('');setReview(true)}}}><label>Имя<input required maxLength={100} disabled={busy||review} value={name} onChange={e=>setName(e.target.value)}/></label><label>Контакт (необязательно)<input maxLength={100} disabled={busy||review} value={contact} onChange={e=>setContact(e.target.value)}/></label><label>Тариф<select required disabled={busy||review} value={tariffId} onChange={e=>setTariffId(e.target.value)}><option value="">Выберите тариф</option>{tariffs.map(t=><option key={t.id} value={t.id}>{t.name} · ID {t.id}</option>)}</select></label>{!busy&&tariffs.length===0&&!error&&<p>Доступные тарифы не найдены.</p>}<button type="submit" disabled={busy||review||!valid}>Проверить перед созданием</button></form>{review&&selected&&<section aria-label="Подтверждение создания пользователя" style={{marginTop:16}}><h3>Подтвердите создание</h3><p>Имя: {name.trim()}</p><p>Контакт: {contact.trim()||'Не указан'}</p><p>Тариф: {selected.name} · ID {selected.id}</p><p className="muted">Будет создан реальный пользователь панели. Лимиты и срок задаёт выбранный тариф.</p><button disabled={busy} onClick={()=>void create()}>{busy?'Отправляем…':'Подтвердить создание'}</button><button disabled={busy} onClick={()=>setReview(false)}>Отмена</button></section>}</section><ApiCollection key={revision} kind="users"/></>;
}
