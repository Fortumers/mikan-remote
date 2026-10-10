import type { Snapshot } from '../types';
const sample: Snapshot = {
 servers:[{id:'fi-1',name:'Helsinki 01',location:'Финляндия',online:true,cpu:32,trafficGb:124},{id:'de-1',name:'Frankfurt 01',location:'Германия',online:true,cpu:48,trafficGb:218},{id:'nl-1',name:'Amsterdam 01',location:'Нидерланды',online:false,cpu:0,trafficGb:0}],
 users:[{id:'1001',name:'demo_alex',plan:'Месяц',active:true,expires:'2026-11-10'},{id:'1002',name:'demo_maria',plan:'Год',active:true,expires:'2027-10-01'},{id:'1003',name:'demo_ivan',plan:'Месяц',active:false,expires:'2026-10-01'}],
 payments:[{id:'pay-1',user:'demo_alex',amount:199,status:'Оплачен',date:'2026-10-10'},{id:'pay-2',user:'demo_maria',amount:1790,status:'Оплачен',date:'2026-10-09'},{id:'pay-3',user:'demo_ivan',amount:199,status:'Ожидает',date:'2026-10-08'}],
 traffic:[{day:'Пн',gb:42},{day:'Вт',gb:68},{day:'Ср',gb:57},{day:'Чт',gb:92},{day:'Пт',gb:81},{day:'Сб',gb:102},{day:'Вс',gb:65}],
 events:[{id:'e1',text:'Тестовое событие: Amsterdam 01 недоступен',time:'11:20'},{id:'e2',text:'Тестовый платёж успешно обработан',time:'11:15'},{id:'e3',text:'Демонстрационные данные загружены',time:'11:00'}]
};
export interface DashboardService { load():Promise<Snapshot> }
export const dashboardService:DashboardService = {async load(){await new Promise(resolve=>setTimeout(resolve,350));return structuredClone(sample)}};
