import React,{useState} from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import RealSections from './RealSections';
import './styles.css';
import './connection.css';
import './theme.css';
function Workspace(){
 const [demo,setDemo]=useState(false);
 return <><div className="app-modebar"><span className="mode-caption">Мониторинг сервиса</span><div className="mode-selector" aria-label="Режим приложения"><button aria-pressed={!demo} onClick={()=>setDemo(false)}>Рабочий режим</button><button aria-pressed={demo} onClick={()=>setDemo(true)}>Демо</button></div></div>{demo&&<div className="demo-notice" role="status">Демонстрационный режим — все показатели вымышлены</div>}<div hidden={demo}><RealSections/></div>{demo&&<App/>}</>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Workspace/></React.StrictMode>);
