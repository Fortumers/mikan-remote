use super::{current,fetch,ConnectionState};
use reqwest::header::AUTHORIZATION;
use serde_json::{json,Map,Value};
use tauri::State;
fn port_valid(s:&str)->bool{
 let pieces:Vec<_>=s.split('-').collect();if pieces.len()>2{return false}
 let mut nums=Vec::new();for p in pieces{if p.is_empty()||p.len()>5||!p.bytes().all(|c|c.is_ascii_digit()){return false}match p.parse::<u32>(){Ok(n) if (1..=65535).contains(&n)=>nums.push(n),_=>return false}}
 nums.len()==1||nums[0]<=nums[1]
}
fn snapshot(rows:&Value,node_id:u64,id:u64)->Result<Value,String>{
 if node_id==0||id==0||node_id>9007199254740991||id>9007199254740991{return Err("Некорректный ID".into())}
 let list=rows.as_array().ok_or_else(||"Неподдерживаемая схема подключений".to_string())?;
 let row=list.iter().find(|r|r.get("id").and_then(Value::as_u64)==Some(id)).ok_or_else(||"Подключение не найдено".to_string())?;
 if row.get("node_id").and_then(Value::as_u64)!=Some(node_id){return Err("Подключение принадлежит другой ноде".into())}
 if row.get("port").and_then(Value::as_str).is_none(){return Err("Панель не вернула поддерживаемый порт".into())}
 let mut safe=Map::new();for k in ["id","node_id","name","preset","port","enabled"]{if let Some(v)=row.get(k){if v.is_string()||v.is_number()||v.is_boolean()||v.is_null(){safe.insert(k.into(),v.clone());}}}Ok(Value::Object(safe))
}
#[tauri::command]
pub async fn get_editable_inbound(node_id:u64,id:u64,state:State<'_,ConnectionState>)->Result<Value,String>{snapshot(&fetch(&current(&state)?,"api/v1/inbounds").await?,node_id,id)}
#[tauri::command]
pub async fn update_inbound_port(node_id:u64,id:u64,port:String,expected:Value,confirmed:bool,state:State<'_,ConnectionState>)->Result<(),String>{
 if !confirmed{return Err("Подтвердите изменение порта".into())}let port=port.trim();if !port_valid(port){return Err("Порт: 1–65535 или возрастающий диапазон".into())}
 let connection=current(&state)?;
 let actual=snapshot(&fetch(&connection,"api/v1/inbounds").await?,node_id,id)?;
 if actual!=expected{return Err("Подключение изменилось. Загрузите его заново".into())}
 if actual.get("port").and_then(Value::as_str)==Some(port){return Err("Порт не изменился".into())}
 let url=connection.base.join(&format!("api/v1/inbounds/{id}")).map_err(|_|"Ошибка адреса API".to_string())?;
 let response=connection.client.patch(url).header(AUTHORIZATION,connection.authorization.clone()).json(&json!({"port":port})).send().await.map_err(|_|"Нет ответа. Порт мог измениться: загрузите подключение перед повтором".to_string())?;
 let code=response.status().as_u16();match code{200..=299=>Ok(()),401=>Err("Ключ не принят".into()),403=>Err("Недостаточно прав записи или требуется сессия".into()),404=>Err("Подключение не найдено".into()),400|422=>Err(format!("Панель отклонила порт (HTTP {code}). Проверьте конфликт и поддержку диапазона")),_=>Err(format!("HTTP {code}. Проверьте фактическое состояние перед повтором"))}
}
#[cfg(test)]mod tests{use super::*;#[test]fn ports(){assert!(port_valid("443"));assert!(port_valid("20000-20100"));for s in ["","0","65536","2-1","1-2-3"]{assert!(!port_valid(s))}}}
