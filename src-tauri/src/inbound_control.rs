use super::{current,fetch,ConnectionState};
use reqwest::header::AUTHORIZATION;
use serde_json::{json,Value};
use tauri::State;
#[tauri::command]
pub async fn set_inbound_enabled(node_id:u64,id:u64,enabled:bool,expected_enabled:bool,confirmed:bool,state:State<'_,ConnectionState>)->Result<(),String>{
 if !confirmed{return Err("Подтвердите изменение подключения".into())}
 if node_id==0||id==0||node_id>9007199254740991||id>9007199254740991{return Err("Некорректный ID".into())}
 if enabled==expected_enabled{return Err("Нет изменения состояния".into())}
 let connection=current(&state)?;
 let data=fetch(&connection,"api/v1/inbounds").await?;
 let rows=data.as_array().ok_or_else(||"Неподдерживаемая схема подключений".to_string())?;
 let row=rows.iter().find(|r|r.get("id").and_then(Value::as_u64)==Some(id)).ok_or_else(||"Подключение не найдено".to_string())?;
 if row.get("node_id").and_then(Value::as_u64)!=Some(node_id)||row.get("enabled").and_then(Value::as_bool)!=Some(expected_enabled){return Err("Подключение изменилось или принадлежит другой ноде. Обновите данные".into())}
 let url=connection.base.join(&format!("api/v1/inbounds/{id}")).map_err(|_|"Ошибка адреса API".to_string())?;
 let response=connection.client.patch(url).header(AUTHORIZATION,connection.authorization.clone()).json(&json!({"enabled":enabled})).send().await.map_err(|_|"Нет ответа. Состояние могло измениться: обновите данные перед повтором".to_string())?;
 let code=response.status().as_u16();
 match code{200..=299=>Ok(()),401=>Err("Ключ не принят".into()),403=>Err("Недостаточно прав записи или требуется сессия".into()),404=>Err("Подключение не найдено".into()),400|422=>Err(format!("Панель отклонила изменение (HTTP {code})")),_=>Err(format!("HTTP {code}. Обновите данные перед повтором"))}
}
