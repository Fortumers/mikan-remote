import {useState} from 'react';
import ServerTools from './ServerTools';
import InboundEditor from './InboundEditor';
import './users.css';
export default function ServerConsole(){const [editing,setEditing]=useState(false);return <><div className="user-tabs" role="group" aria-label="Разделы серверов"><button aria-pressed={!editing} onClick={()=>setEditing(false)}>Список и создание</button><button aria-pressed={editing} onClick={()=>setEditing(true)}>Редактор подключения</button></div>{editing?<InboundEditor/>:<ServerTools/>}</>}
