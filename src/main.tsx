import React,{useState} from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import RealSections from './RealSections';
import './styles.css';
import './connection.css';
function Workspace(){
 const [demo,setDemo]=useState(false);
 return <><div className="workspace-switch"><span>PumbaNET Admin</span><button aria-pressed={!demo} onClick={()=>setDemo(false)}>Рабочее приложение</button><button aria-pressed={demo} onClick={()=>setDemo(true)}>Демо · вымышленные данные</button></div><div hidden={demo}><RealSections/></div>{demo&&<App/>}</>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Workspace/></React.StrictMode>);
