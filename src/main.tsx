import React, {useState} from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Connection from './Connection';
import './styles.css';
import './connection.css';
function Workspace(){
 const [mode,setMode]=useState<'demo'|'connection'>('connection');
 return <><div className="workspace-switch"><span>PumbaNET Admin</span><button aria-pressed={mode==='connection'} onClick={()=>setMode('connection')}>Подключение Mikan</button><button aria-pressed={mode==='demo'} onClick={()=>setMode('demo')}>Демо-интерфейс</button></div><div hidden={mode!=='connection'}><Connection/></div>{mode==='demo'&&<App/>}</>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Workspace/></React.StrictMode>);
