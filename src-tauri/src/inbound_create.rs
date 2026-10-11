use super::{current,fetch,ConnectionState};
use reqwest::header::AUTHORIZATION;
use serde_json::{json,Value};
use tauri::State;
fn valid_port(port:&str)->bool{
 if port.is_empty(){return true}
 let parts:Vec<_>=port.split('-').collect();
 if parts.is_empty()||parts.len()>2{return false}
 let mut nums=Vec::new();
 for p in parts{if p.is_empty()||p.len()>5||!p.bytes().all(|c|c.is_ascii_digit()){return false}match p.parse::<u32>(){Ok(n) if n>=1&&n<=65535=>nums.push(n),_=>return false}}
 nums.len()==1||nums[0]<=nums[1]
}
#[tauri::command]
pub async fn create_preset_inbound(node_id:u64,preset:String,port:String,dest:String,confirmed:bool,state:State<'_,ConnectionState>)->Result<(),String>{
 if !confirmed{return Err("Подтвердите создание подключения".into())}
 if node_id==0||node_id>9007199254740991{return Err("Выберите конкретную ноду".into())}
 let port=port.trim();let dest=dest.trim();
 if preset.is_empty()||preset.len()>100||preset=="custom"||!valid_port(port)||dest.chars().count()>255{return Err("Проверьте пресет, порт и REALITY-цель".into())}
 let connection=current(&state)?;
 let nodes=fetch(&connection,"api/v1/nodes").await?;
 let nodes=nodes.as_array().ok_or_else(||"Неподдерживаемая схема нод".to_string())?;
 let node=nodes.iter().find(|r|r.get("id").and_then(Value::as_u64)==Some(node_id)).ok_or_else(||"Нода не найдена. Обновите каталог".to_string())?;
 if node.get("enabled")==Some(&Value::Bool(false)){return Err("Нода выключена в панели".into())}
 let catalog=fetch(&connection,"api/v1/presets").await?;
 let catalog=catalog.as_array().ok_or_else(||"Неподдерживаемая схема пресетов".to_string())?;
 if !catalog.iter().any(|p|p.get("id").and_then(Value::as_str)==Some(preset.as_str())){return Err("Пресет отсутствует в панели. Обновите каталог".into())}
 let mut body=json!({"node_id":node_id,"preset":preset});
 if !port.is_empty(){body["port"]=json!(port)}
 if !dest.is_empty(){body["dest"]=json!(dest)}
 let url=connection.base.join("api/v1/inbounds").map_err(|_|"Ошибка адреса API".to_string())?;
 let response=connection.client.post(url).header(AUTHORIZATION,connection.authorization.clone()).json(&body).send().await.map_err(|_|"Нет ответа. Подключение могло быть создано: обновите список перед повтором".to_string())?;
 let code=response.status().as_u16();
 match code{200..=299=>Ok(()),401=>Err("Ключ не принят панелью".into()),403=>Err("Недостаточно прав записи или требуется сессия".into()),404=>Err("Операция или нода не найдены".into()),400|422=>Err(format!("Mikan отклонила параметры (HTTP {code}). Проверьте порт, цель и требования пресета")),409=>Err("Конфликт настроек. Обновите список и проверьте порт".into()),_=>Err(format!("HTTP {code}. Перед повтором проверьте список подключений"))}
}
#[cfg(test)]
mod tests{use super::*;#[test]fn ports(){for p in ["","443","8443","20000-20100"]{assert!(valid_port(p))}for p in ["0","65536","20-10","1-2-3","https://x","-1"]{assert!(!valid_port(p))}}}
