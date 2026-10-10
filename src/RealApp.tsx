import {useState} from 'react';
import {invoke,isTauri} from '@tauri-apps/api/core';
import {LayoutDashboard,Server,Users,CreditCard,Activity,Settings,RefreshCw} from 'lucide-react';
import {BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,CartesianGrid} from 'recharts';
import Connection from './Connection';
import LiveOverview from './LiveOverview';
import ApiCollection from './ApiCollection';
const menu=[{name:'Главная',icon:LayoutDashboard},{name:'Серверы',icon:Server},{name:'Пользователи',icon:Users},{name:'Платежи',icon:CreditCard},{name:'События',icon:Activity},{name:'Настройки',icon:Settings}] as const;
type Page=typeof menu[number]['name'];
export default function RealApp(){
 const [page,setPage]=useState<Page>('Настройки');
 const [overview,setOverview]=useState<unknown>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[updated,setUpdated]=useState('');
 const [events,setEvents]=useState<{id:number;time:string;text:string}[]>([]);
 function log(text:string){setEvents(old=>[{id:Date.now(),time:new Date().toLocaleTimeString('ru-RU'),text},...old].slice(0,30))}
 async function refresh(){
  if(!isTauri()){setError('Подключение доступно в настольном приложении');return}
  setBusy(true);setError('');
  try{setOverview(await invoke<unknown>('get_overview'));setUpdated(new Date().toLocaleTimeString('ru-RU'));log('Сводка главной обновлена')}catch(e){setError(typeof e==='string'?e:'Ошибка обновления');log('Не удалось обновить сводку')}finally{setBusy(false)}
 }
 function navigate(next:Page){setPage(next);if(next==='Настройки'){setOverview(null);setUpdated('');setError('')}else if(next==='Главная'&&!busy){void refresh()}}
 const obj=typeof overview==='object'&&overview!==null&&!Array.isArray(overview)?overview as Record<string,unknown>:null;
 const chart=obj&&typeof obj.traffic_today==='number'&&Number.isFinite(obj.traffic_today)&&obj.traffic_today>=0&&typeof obj.traffic_yesterday==='number'&&Number.isFinite(obj.traffic_yesterday)&&obj.traffic_yesterday>=0?[{label:'Вчера',gb:obj.traffic_yesterday/1e9},{label:'Сегодня',gb:obj.traffic_today/1e9}]:null;
 return <div className="shell"><aside><div className="brand"><span className="logo">P</span><div>PumbaNET<small>ADMIN DESKTOP</small></div></div><nav>{menu.map(({name,icon:Icon})=><button key={name} className={page===name?'nav active':'nav'} disabled={busy} onClick={()=>navigate(name)}><Icon size={19}/>{name}</button>)}</nav><div className="sidebar-note">Рабочий режим · Только чтение<br/>Без демонстрационных записей</div></aside><main><header><div><p className="eyebrow">РЕАЛЬНАЯ ПАНЕЛЬ MIKAN</p><h1>{page}</h1></div>{page==='Главная'&&<button disabled={busy} onClick={()=>void refresh()}><RefreshCw size={16}/>{busy?'Загрузка…':'Обновить'}</button>}</header>{page==='Главная'&&<div className="demo"><span>{busy?'Получение данных…':updated?`Последняя сводка получена в ${updated}`:'Сводка не загружена'}</span><span>Только API · без подстановки демо</span></div>}<div hidden={page!=='Настройки'}><Connection/></div>{page==='Главная'&&<>{error&&<div className="error" role="alert">{error}</div>}{overview!==null?<><LiveOverview value={overview} stale={!!error}/>{chart&&<section className="panel chart" style={{marginTop:20}}><h2>Трафик сегодня и вчера · ГБ</h2><p className="muted">Сравнение двух суточных значений, не недельная история. Сегодня — неполный день.</p><ResponsiveContainer width="100%" height={260}><BarChart data={chart}><CartesianGrid stroke="#29313e" vertical={false}/><XAxis dataKey="label" stroke="#94a3b8"/><YAxis stroke="#94a3b8"/><Tooltip contentStyle={{background:'#171e29',border:'1px solid #334155'}}/><Bar dataKey="gb" name="ГБ" fill="#fb923c" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></section>}</>:<section className="panel"><h2>{busy?'Загрузка сводки':'Нет данных панели'}</h2><p className="muted">Подключитесь в «Настройках», затем откройте «Главную».</p><button disabled={busy} onClick={()=>navigate('Настройки')}>Открыть настройки</button></section>}</>}{page==='События'&&<section className="panel"><h2>Локальные события приложения</h2><p className="muted">Это не аудит Mikan. История хранится только в памяти текущего запуска.</p>{events.length?events.map((e,i)=><div className="event" key={`${e.id}-${i}`}><span className="muted">{e.time}</span><span>{e.text}</span></div>):<p>Событий пока нет.</p>}</section>}{page==='Серверы'&&<ApiCollection key="nodes" kind="nodes"/>}{page==='Пользователи'&&<ApiCollection key="users" kind="users"/>}{page==='Платежи'&&<ApiCollection key="payments" kind="payments"/>}<footer>PumbaNET Admin · Рабочий режим · Статус сохранённого подключения смотрите в настройках</footer></main></div>;
}
