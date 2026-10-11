import {useState} from 'react';
import {LayoutDashboard,Server,Users,CreditCard,Activity,Settings} from 'lucide-react';
import Connection from './Connection';
import ApiCollection from './ApiCollection';
import Dashboard from './Dashboard';
import UserWorkspace from './UserWorkspace';
import ServerTools from './ServerTools';
import './dashboard.css';
const menu=[{name:'Главная',icon:LayoutDashboard},{name:'Серверы',icon:Server},{name:'Пользователи',icon:Users},{name:'Платежи',icon:CreditCard},{name:'События',icon:Activity},{name:'Настройки',icon:Settings}] as const;
type Page=typeof menu[number]['name'];
export default function RealApp(){
 const [page,setPage]=useState<Page>('Настройки');
 const [events,setEvents]=useState<{time:string;text:string}[]>([]);
 function navigate(next:Page){setPage(next);setEvents(old=>[{time:new Date().toLocaleTimeString('ru-RU'),text:`Открыт раздел «${next}»`},...old].slice(0,30))}
 return <div className="shell remote-shell"><aside><div className="brand"><span className="logo" aria-hidden="true">M</span><div>MIKAN<small>REMOTE</small></div></div><nav>{menu.map(({name,icon:Icon})=><button key={name} className={page===name?'nav active':'nav'} onClick={()=>navigate(name)}><Icon size={19}/>{name}</button>)}</nav><div className="sidebar-note">Удалённое управление Mikan<br/>Пользователи и подключения — управление<br/>Ноды и платежи — просмотр</div></aside><main>{page!=='Главная'&&<header><div><p className="eyebrow">MIKAN REMOTE</p><h1>{page}</h1></div></header>}<div hidden={page!=='Настройки'}><Connection/></div>{page==='Главная'&&<Dashboard onSettings={()=>navigate('Настройки')} onServers={()=>navigate('Серверы')}/>} {page==='Серверы'&&<ServerTools/>}{page==='Пользователи'&&<UserWorkspace/>}{page==='Платежи'&&<ApiCollection key="payments" kind="payments"/>}{page==='События'&&<section className="panel"><h2>Локальные события приложения</h2><p className="muted">Только переходы между разделами в текущем запуске. Это не серверный аудит и не журнал API-запросов.</p>{events.length?events.map((e,i)=><div className="event" key={i}><span className="muted">{e.time}</span><span>{e.text}</span></div>):<p>Событий пока нет.</p>}</section>}{page!=='Главная'&&<footer>Mikan Remote · Подтверждение перед изменением данных панели</footer>}</main></div>;
}
