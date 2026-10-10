import {useState} from 'react';
import UserManagement from './UserManagement';
import UserEditor from './UserEditor';
export default function UserWorkspace(){
 const [editing,setEditing]=useState(false);
 return <><div className="row" style={{marginBottom:16}}><button aria-pressed={!editing} onClick={()=>setEditing(false)}>Список и создание</button><button aria-pressed={editing} onClick={()=>setEditing(true)}>Редактировать по ID</button></div>{editing?<UserEditor/>:<UserManagement/>}</>;
}
