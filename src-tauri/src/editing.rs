use super::{current, fetch, ConnectionState};
use reqwest::header::AUTHORIZATION;
use serde_json::{Map, Value};
use tauri::State;
fn endpoint(id: u64) -> Result<String, String> {
    if id == 0 || id > 9007199254740991 { return Err("Некорректный ID пользователя".into()); }
    Ok(format!("api/v1/users/{id}"))
}
fn view(value: Value, id: u64) -> Result<Value, String> {
    let obj = value.as_object().ok_or_else(|| "Неподдерживаемая схема пользователя".to_string())?;
    if obj.get("id").and_then(Value::as_u64) != Some(id) || obj.get("name").and_then(Value::as_str).is_none() { return Err("Неожиданный пользователь в ответе панели".into()); }
    let mut result = Map::new();
    for key in ["id", "name", "contact", "note", "traffic_limit", "device_limit", "state"] {
        if let Some(v) = obj.get(key) { result.insert(key.into(), v.clone()); }
    }
    Ok(Value::Object(result))
}
fn validate(patch: &Value) -> Result<(), String> {
    let obj = patch.as_object().ok_or_else(|| "Изменения должны быть объектом".to_string())?;
    if obj.is_empty() { return Err("Нет изменений".into()); }
    for (key, value) in obj {
        let valid = match key.as_str() {
            "name" => value.as_str().map(|s| !s.trim().is_empty() && s.chars().count() <= 100).unwrap_or(false),
            "contact" => value.as_str().map(|s| s.chars().count() <= 100).unwrap_or(false),
            "note" => value.as_str().map(|s| s.chars().count() <= 2000).unwrap_or(false),
            "disabled" => value.is_boolean(),
            "traffic_unlimited" => value == &Value::Bool(true),
            "traffic_limit" => value.as_u64().map(|n| n <= 9007199254740991).unwrap_or(false),
            "device_limit" => value.as_u64().map(|n| (1..=100).contains(&n)).unwrap_or(false),
            _ => false,
        };
        if !valid { return Err(format!("Недопустимое поле или значение: {key}")); }
    }
    if obj.contains_key("traffic_limit") && obj.contains_key("traffic_unlimited") { return Err("Выберите лимит или безлимит".into()); }
    Ok(())
}
#[tauri::command]
pub async fn get_editable_user(id: u64, state: State<'_, ConnectionState>) -> Result<Value, String> {
    let path = endpoint(id)?;
    view(fetch(&current(&state)?, &path).await?, id)
}
#[tauri::command]
pub async fn update_user(id: u64, patch: Value, expected: Value, confirmed: bool, state: State<'_, ConnectionState>) -> Result<(), String> {
    if !confirmed { return Err("Подтвердите изменения".into()); }
    validate(&patch)?;
    let path = endpoint(id)?;
    let connection = current(&state)?;
    if view(fetch(&connection, &path).await?, id)? != expected { return Err("Данные пользователя изменились. Загрузите его заново и проверьте изменения".into()); }
    let url = connection.base.join(&path).map_err(|_| "Ошибка адреса API".to_string())?;
    let response = connection.client.patch(url).header(AUTHORIZATION, connection.authorization.clone()).json(&patch).send().await.map_err(|_| "Нет ответа на сохранение. Изменения могли примениться: загрузите пользователя заново перед повтором".to_string())?;
    let code = response.status().as_u16();
    match code {
        200..=299 => Ok(()),
        401 => Err("Ключ не принят панелью".into()),
        403 => Err("Недостаточно прав записи или требуется админская сессия".into()),
        404 => Err("Пользователь или операция не найдены".into()),
        400 | 422 => Err(format!("Панель отклонила изменения (HTTP {code})")),
        _ => Err(format!("HTTP {code}. Перед повтором загрузите пользователя: результат может быть неопределён")),
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn validates_edit_fields() {
        assert!(validate(&json!({"traffic_limit":0,"device_limit":1})).is_ok());
        assert!(validate(&json!({"traffic_unlimited":true})).is_ok());
        assert!(validate(&json!({"device_limit":101})).is_err());
        assert!(validate(&json!({"traffic_limit":-1})).is_err());
        assert!(validate(&json!({"name":" "})).is_err());
        assert!(validate(&json!({"tariff_id":1})).is_err());
        assert!(validate(&json!({"traffic_limit":1,"traffic_unlimited":true})).is_err());
        assert!(endpoint(0).is_err());
    }
}
