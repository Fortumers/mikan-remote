export type Page = 'Главная' | 'Серверы' | 'Пользователи' | 'Платежи' | 'События' | 'Настройки';
export interface Server {id:string;name:string;location:string;online:boolean;cpu:number;trafficGb:number}
export interface User {id:string;name:string;plan:string;active:boolean;expires:string}
export interface Payment {id:string;user:string;amount:number;status:'Оплачен'|'Ожидает';date:string}
export interface Snapshot {servers:Server[];users:User[];payments:Payment[];traffic:{day:string;gb:number}[];events:{id:string;text:string;time:string}[]}
