import {useState} from 'react';
import UserManagement from './UserManagement';
import UserEditor from './UserEditor';
import './users.css';
export default function UserWorkspace(){
 const [editing,setEditing]=useState(false);
 return <div className="user-workspace"><div className="user-tabs" role="group" aria-label="Разделы пользователей"><button aria-pressed={!editing} onClick={()=>setEditing(false)}>Список и создание</button><button aria-pressed={editing} onClick={()=>setEditing(true)}>Редактировать по ID</button></div><div className={editing?'user-content user-edit':'user-content user-create'}>{editing?<UserEditor/>:<UserManagement/>}</div></div>;
}
