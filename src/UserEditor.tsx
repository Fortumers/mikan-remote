import {useEffect,useRef,useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
type Row=Record<string,unknown>;
const obj=(v:unknown):v is Row=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const labels:Record<string,string>={name:'Имя',contact:'Контакт',note:'Заметка',disabled:'Отключён',traffic_limit:'Лимит трафика',traffic_unlimited:'Безлимитный трафик',device_limit:'Лимит устройств'};
export default function UserEditor(){
 const [id,setId]=useState(''),[user,setUser]=useState<Row|null>(null),[name,setName]=useState(''),[contact,setContact]=useState(''),[note,setNote]=useState('');
 const [trafficMode,setTrafficMode]=useState('keep'),[traffic,setTraffic]=useState(''),[deviceMode,setDeviceMode]=useState('keep'),[devices,setDevices]=useState(''),[disabled,setDisabled]=useState('keep');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[review,setReview]=useState<Row|null>(null);
 const alive=useRef(true),lock=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 async function load(){
  if(lock.current)return;setError('');setMessage('');setReview(null);setUser(null);
  if(!/^[1-9]\d*$/.test(id)||!Number.isSafeInteger(Number(id))){setError('Введите положительный целочисленный ID');return}
  lock.current=true;setBusy(true);
  try{const value=await invoke<unknown>('get_editable_user',{id:Number(id)});if(!obj(value)||value.id!==Number(id)||typeof value.name!=='string')throw 'Неподдерживаемая схема пользователя';if(alive.current){setUser(value);setName(value.name);setContact(typeof value.contact==='string'?value.contact:'');setNote(typeof value.note==='string'?value.note:'');setTrafficMode('keep');setDeviceMode('keep');setDisabled('keep');setTraffic('');setDevices('')}}catch(e){if(alive.current)setError(typeof e==='string'?e:'Ошибка загрузки пользователя')}finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 function prepare(){
  if(!user)return;setError('');setMessage('');const p:Row={};
  if(!name.trim()||Array.from(name.trim()).length>100||Array.from(contact).length>100||Array.from(note).length>2000){setError('Проверьте имя (до 100), контакт (до 100), заметку (до 2000 символов)');return}
  if(name.trim()!==user.name)p.name=name.trim();
  if(contact!==(typeof user.contact==='string'?user.contact:''))p.contact=contact;
  if(note!==(typeof user.note==='string'?user.note:''))p.note=note;
  if(trafficMode==='unlimited')p.traffic_unlimited=true;
  if(trafficMode==='set'){if(!/^\d+(?:[.,]\d{1,9})?$/.test(traffic.trim())){setError('Введите неотрицательное число ГБ, до 9 знаков после запятой');return}const [whole,fraction='']=traffic.trim().replace(',','.').split('.');const bytes=BigInt(whole)*1000000000n+BigInt(fraction.padEnd(9,'0'));if(bytes>BigInt(Number.MAX_SAFE_INTEGER)){setError('Лимит слишком велик');return}p.traffic_limit=Number(bytes)}
  if(deviceMode==='set'){const n=Number(devices);if(!/^\d+$/.test(devices)||!Number.isInteger(n)||n<1||n>100){setError('Лимит устройств: целое число от 1 до 100');return}p.device_limit=n}
  if(disabled!=='keep')p.disabled=disabled==='yes';
  if(Object.keys(p).length===0){setMessage('Нет изменений');return}setReview(p);
 }
 async function save(){
  if(lock.current||!user||!review)return;lock.current=true;setBusy(true);setError('');
  try{await invoke('update_user',{id:user.id,patch:review,expected:user,confirmed:true});if(alive.current){setMessage('Панель подтвердила сохранение. Загрузите пользователя заново, чтобы проверить результат.');setReview(null);setUser(null)}}catch(e){if(alive.current){setError(typeof e==='string'?e:'Неизвестный результат. Загрузите пользователя перед повтором');setReview(null);setUser(null)}}finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 const frozen=busy||review!==null;
 return <section className="panel"><h2>Редактирование пользователя</h2><p className="muted">Возьмите ID из списка пользователей. Меняются только выбранные поля; тариф, срок и использованный трафик не сбрасываются этой формой.</p><form onSubmit={e=>{e.preventDefault();void load()}}><label>ID пользователя<input inputMode="numeric" value={id} disabled={frozen} onChange={e=>{setId(e.target.value);setUser(null);setMessage('')}}/></label><button disabled={frozen} type="submit">Загрузить пользователя</button></form>{error&&<div className="error" role="alert">{error}</div>}{message&&<p role="status">{message}</p>}{user&&<><h3>{String(user.name)} · ID {String(user.id)}</h3><p className="muted">Текущий лимит трафика: {user.traffic_limit===null?'Без лимита':typeof user.traffic_limit==='number'?`${user.traffic_limit} байт`:'Нет данных'} · Устройства: {typeof user.device_limit==='number'?String(user.device_limit):user.device_limit===null?'Без лимита':'Нет данных'} · Состояние: {typeof user.state==='string'?user.state:'Нет данных'}</p><form onSubmit={e=>{e.preventDefault();prepare()}}><label>Имя<input value={name} disabled={frozen} maxLength={100} onChange={e=>setName(e.target.value)}/></label><label>Контакт<input value={contact} disabled={frozen} maxLength={100} onChange={e=>setContact(e.target.value)}/></label><label>Заметка<textarea value={note} disabled={frozen} maxLength={2000} onChange={e=>setNote(e.target.value)}/></label><label>Трафик<select value={trafficMode} disabled={frozen} onChange={e=>setTrafficMode(e.target.value)}><option value="keep">Не менять</option><option value="set">Задать лимит ГБ</option><option value="unlimited">Снять лимит</option></select></label>{trafficMode==='set'&&<label>Лимит, ГБ<input inputMode="decimal" value={traffic} disabled={frozen} onChange={e=>setTraffic(e.target.value)}/><small>1 ГБ = 1 000 000 000 байт. 0 отправляется как нулевой лимит, не как безлимит.</small></label>}<label>Устройства<select value={deviceMode} disabled={frozen} onChange={e=>setDeviceMode(e.target.value)}><option value="keep">Не менять</option><option value="set">Задать лимит</option></select></label>{deviceMode==='set'&&<label>Количество устройств (1–100)<input inputMode="numeric" value={devices} disabled={frozen} onChange={e=>setDevices(e.target.value)}/></label>}<label>Доступ<select value={disabled} disabled={frozen} onChange={e=>setDisabled(e.target.value)}><option value="keep">Не менять</option><option value="yes">Отключить</option><option value="no">Включить</option></select></label><button disabled={frozen} type="submit">Проверить изменения</button></form></>}{review&&user&&<section aria-label="Подтверждение редактирования"><h3>Сохранить изменения для {String(user.name)} · ID {String(user.id)}?</h3><ul>{Object.entries(review).map(([k,v])=><li key={k}>{labels[k]??k}: {k==='traffic_limit'?`${String(v)} байт (${Number(v)/1e9} ГБ)`:typeof v==='boolean'?(v?'Да':'Нет'):String(v)||'(пусто)'}</li>)}</ul><p className="muted">Перед записью проверяем, не изменились ли загруженные поля. Это предварительная проверка, не атомарная блокировка. При потере ответа не повторяйте сохранение без загрузки пользователя.</p><button disabled={busy} onClick={()=>void save()}>{busy?'Сохраняем…':'Подтвердить сохранение'}</button><button disabled={busy} onClick={()=>setReview(null)}>Отмена</button></section>}</section>;
}
