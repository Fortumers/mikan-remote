import {useState} from 'react';
import ServerTools from './ServerTools';
import InboundEditor from './InboundEditor';
import './users.css';
export default function ServerConsole(){
 const [editing,setEditing]=useState(false);
 return <><div className="user-tabs" role="group" aria-label="Задачи серверного раздела"><button aria-pressed={!editing} onClick={()=>setEditing(false)}>Обзор и управление</button><button aria-pressed={editing} onClick={()=>setEditing(true)}>Изменить порт</button></div><section className="server-page-guide" aria-label="Как пользоваться разделом"><div><h2>{editing?'Изменение порта существующего подключения':'Подключения на выбранном сервере'}</h2><p>{editing?'Выберите ноду и подключение, загрузите текущие настройки, задайте новый порт и проверьте изменения перед сохранением. Смена порта может прервать соединения.':'Чтобы добавить протокол, выберите сервер и пресет в форме создания. Для включения или отключения используйте блок управления подключением ниже. Список подключений и каталог находятся в нижней части страницы.'}</p></div><span className="guide-label">{editing?'ПОРТ / ПОДТВЕРЖДЕНИЕ':'НОДА / ПОДКЛЮЧЕНИЕ'}</span></section>{editing?<InboundEditor/>:<ServerTools/>}</>;
}
