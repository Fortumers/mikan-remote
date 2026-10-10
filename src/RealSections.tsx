import {useState} from 'react';
import RealApp from './RealApp';
import ApiCollection from './ApiCollection';
export default function RealSections(){
 const [section,setSection]=useState<'dashboard'|'users'|'nodes'|'payments'>('dashboard');
 return <><div className="workspace-switch"><span>API-разделы · предварительная интеграция</span><button onClick={()=>setSection('dashboard')}>Главная / подключение</button><button onClick={()=>setSection('users')}>Пользователи API</button><button onClick={()=>setSection('nodes')}>Серверы API</button><button onClick={()=>setSection('payments')}>Платежи API</button></div><div hidden={section!=='dashboard'}><RealApp/></div>{section!=='dashboard'&&<div className="connection-page"><ApiCollection key={section} kind={section}/></div>}</>;
}
