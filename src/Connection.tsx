import {useState} from 'react';
import {invoke,isTauri} from '@tauri-apps/api/core';
export default function Connection(){
 const desktop=isTauri();
 const [address,setAddress]=useState('');const [key,setKey]=useState('');const [connected,setConnected]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [overview,setOverview]=useState<unknown>(null);const [traffic,setTraffic]=useState<unknown>(null);const [updated,setUpdated]=useState('');
 async function connect(){
  setBusy(true);setError('');
  try{const result=await invoke<unknown>('connect_panel',{address,apiKey:key});setOverview(result);setTraffic(null);setConnected(true);setKey('');setUpdated(new Date().toLocaleTimeString('ru-RU'))}catch(e){setError(typeof e==='string'?e:'Не удалось подключиться')}finally{setBusy(false)}
 }
 async function refresh(){
  setBusy(true);setError('');
  try{setOverview(await invoke<unknown>('get_overview'));setUpdated(new Date().toLocaleTimeString('ru-RU'))}catch(e){setError(typeof e==='string'?e:'Ошибка обновления')}finally{setBusy(false)}
 }
 async function loadTraffic(){
  setBusy(true);setError('');
  try{setTraffic(await invoke<unknown>('get_traffic'))}catch(e){setError(typeof e==='string'?e:'Ошибка получения трафика')}finally{setBusy(false)}
 }
 async function disconnect(){
  setBusy(true);setError('');
  try{await invoke('disconnect_panel');setConnected(false);setOverview(null);setTraffic(null);setKey('');setUpdated('')}catch(e){setError(typeof e==='string'?e:'Ошибка отключения')}finally{setBusy(false)}
 }
 return <section className="connection-page"><p className="eyebrow">RUST / MIKAN API</p><h1>Подключение к панели</h1><p className="muted">Первый этап интеграции: проверка API и просмотр исходных ответов. Демо-дашборд пока не использует эти данные.</p>{!desktop&&<div className="demo">Открыто в браузере. Реальное подключение доступно только в настольном приложении: npm.cmd run tauri dev</div>}<div className="panel"><div className="row"><h2>Настройки подключения</h2><span className={connected?'badge good':'badge'}>{connected?'Подключено':'Не подключено'}</span></div><form onSubmit={e=>{e.preventDefault();void connect()}}><label htmlFor="panel-address">HTTPS-адрес админки с секретным путём</label><input id="panel-address" type="url" placeholder="https://panel.example.com/secret-admin/" autoComplete="off" required disabled={busy} value={address} onChange={e=>setAddress(e.target.value)}/><label htmlFor="panel-key">API-ключ чтения</label><input id="panel-key" type="password" placeholder="Введите ключ локально" autoComplete="off" required disabled={busy} value={key} onChange={e=>setKey(e.target.value)}/><p className="muted">Не добавляйте /api/v1 в адрес. Ключ не сохраняется в файлы. После успешного подключения поле ключа очищается.</p><div className="connection-actions"><button type="submit" disabled={!desktop||busy||!address.trim()||!key.trim()}>{busy?'Выполняется…':connected?'Заменить подключение':'Проверить и подключить'}</button><button type="button" disabled={!connected||busy} onClick={()=>void refresh()}>Обновить сводку</button><button type="button" disabled={!connected||busy} onClick={()=>void loadTraffic()}>Запросить трафик</button><button type="button" disabled={!connected||busy} onClick={()=>void disconnect()}>Отключиться</button></div></form>{connected&&<p className="muted">Время получения сводки: {updated}. При неудачной замене предыдущее подключение остаётся активным.</p>}{error&&<div role="alert" className="error">{error}</div>}</div>{overview!==null&&<article className="panel response-panel"><h2>Сводка: исходный ответ API</h2><p className="muted">Ответ предыдущего успешного запроса. При ошибке он может быть устаревшим.</p><pre>{JSON.stringify(overview,null,2)}</pre></article>}{traffic!==null&&<article className="panel response-panel"><h2>Трафик: исходный ответ API</h2><pre>{JSON.stringify(traffic,null,2)}</pre></article>}<p className="muted">Ответы могут содержать внутренние данные сервиса. Не публикуйте их и не присылайте скриншоты без проверки и скрытия чувствительных полей.</p></section>;
}
