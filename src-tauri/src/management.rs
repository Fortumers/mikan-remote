use super::{current, fetch, ConnectionState};
use reqwest::header::AUTHORIZATION;
use serde_json::{json, Value};
use tauri::State;
#[tauri::command]
pub async fn get_tariffs(state: State<'_, ConnectionState>) -> Result<Value, String> {
    fetch(&current(&state)?, "api/v1/tariffs").await
}
#[tauri::command]
pub async fn create_user(name: String, contact: String, tariff_id: u64, confirmed: bool, state: State<'_, ConnectionState>) -> Result<(), String> {
    if !confirmed { return Err("Подтвердите создание пользователя".into()); }
    let name = name.trim();
    let contact = contact.trim();
    if name.is_empty() || name.chars().count() > 100 || contact.chars().count() > 100 || tariff_id == 0 || tariff_id > i64::MAX as u64 { return Err("Проверьте имя, контакт и тариф".into()); }
    let connection = current(&state)?;
    let catalog = fetch(&connection, "api/v1/tariffs").await?;
    let tariffs = catalog.as_array().ok_or_else(|| "Неподдерживаемая схема тарифов".to_string())?;
    if !tariffs.iter().any(|t| t.get("id").and_then(Value::as_u64) == Some(tariff_id) && t.get("archived") != Some(&Value::Bool(true)) && t.get("archived").and_then(Value::as_u64) != Some(1)) { return Err("Тариф не найден или архивирован. Обновите список".into()); }
    let url = connection.base.join("api/v1/users").map_err(|_| "Ошибка адреса API".to_string())?;
    let response = connection.client.post(url).header(AUTHORIZATION, connection.authorization.clone()).json(&json!({"name":name,"contact":contact,"tags":[],"tariff_id":tariff_id})).send().await.map_err(|_| "Не удалось получить ответ. Пользователь мог быть создан: сначала обновите список, не повторяйте запрос автоматически".to_string())?;
    let code = response.status().as_u16();
    match code {
        200..=299 => Ok(()),
        401 => Err("Ключ не принят панелью".into()),
        403 => Err("Нужен API-ключ с правами записи; либо операция требует сессию".into()),
        400 | 422 => Err(format!("Панель отклонила параметры (HTTP {code}). Проверьте тариф и версию Mikan")),
        409 => Err("Панель сообщила о конфликте. Проверьте список пользователей".into()),
        300..=399 => Err("Запрос не перенаправлялся. Проверьте конечный адрес панели".into()),
        _ => Err(format!("HTTP {code}. Перед повтором проверьте список: результат операции может быть неопределён")),
    }
}
