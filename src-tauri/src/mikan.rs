use reqwest::{Client, Url, header::{HeaderValue, AUTHORIZATION}};
use serde_json::Value;
use std::{sync::Mutex, time::Duration};
use tauri::State;
#[derive(Clone)]
struct Connection { client: Client, base: Url, authorization: HeaderValue }
#[derive(Default)]
pub struct ConnectionState(Mutex<Option<Connection>>);
fn prepare(address: &str, key: &str) -> Result<Connection, String> {
    let mut base = Url::parse(address.trim()).map_err(|_| "Некорректный адрес панели".to_string())?;
    if base.scheme() != "https" || base.host_str().is_none() { return Err("Нужен полный HTTPS-адрес админки".into()); }
    if !base.username().is_empty() || base.password().is_some() || base.query().is_some() || base.fragment().is_some() { return Err("Адрес не должен содержать логин, пароль, query или fragment".into()); }
    let key = key.trim();
    if key.is_empty() { return Err("Укажите API-ключ чтения".into()); }
    let mut authorization = HeaderValue::from_str(&format!("Bearer {key}")).map_err(|_| "Некорректный API-ключ".to_string())?;
    authorization.set_sensitive(true);
    let path = format!("{}/", base.path().trim_end_matches('/'));
    base.set_path(&path);
    let client = Client::builder().timeout(Duration::from_secs(20)).connect_timeout(Duration::from_secs(10)).redirect(reqwest::redirect::Policy::none()).build().map_err(|_| "Не удалось создать HTTP-клиент".to_string())?;
    Ok(Connection { client, base, authorization })
}
async fn fetch(connection: &Connection, endpoint: &str) -> Result<Value, String> {
    let url = connection.base.join(endpoint).map_err(|_| "Ошибка адреса API".to_string())?;
    let response = connection.client.get(url).header(AUTHORIZATION, connection.authorization.clone()).send().await.map_err(|e| if e.is_timeout() { "Панель не ответила вовремя".to_string() } else { "Ошибка сети или TLS. Проверьте адрес и сертификат".to_string() })?;
    match response.status().as_u16() {
        200..=299 => {},
        401 => return Err("Ключ не принят панелью".into()),
        403 => return Err("Недостаточно прав или требуется админская сессия".into()),
        404 => return Err("API не найден. Проверьте секретный путь и версию Mikan".into()),
        300..=399 => return Err("Укажите конечный HTTPS-адрес без перенаправления".into()),
        code => return Err(format!("Панель вернула HTTP {code}")),
    }
    response.json().await.map_err(|_| "Панель вернула невалидный JSON".to_string())
}
fn current(state: &ConnectionState) -> Result<Connection, String> {
    state.0.lock().map_err(|_| "Ошибка состояния подключения".to_string())?.clone().ok_or_else(|| "Панель не подключена".to_string())
}
#[tauri::command]
pub async fn connect_panel(address: String, api_key: String, state: State<'_, ConnectionState>) -> Result<Value, String> {
    let connection = prepare(&address, &api_key)?;
    let overview = fetch(&connection, "api/v1/stats/overview").await?;
    *state.0.lock().map_err(|_| "Ошибка состояния подключения".to_string())? = Some(connection);
    Ok(overview)
}
#[tauri::command]
pub fn disconnect_panel(state: State<'_, ConnectionState>) -> Result<(), String> {
    *state.0.lock().map_err(|_| "Ошибка состояния подключения".to_string())? = None;
    Ok(())
}
#[tauri::command]
pub async fn get_overview(state: State<'_, ConnectionState>) -> Result<Value, String> {
    let connection = current(&state)?;
    fetch(&connection, "api/v1/stats/overview").await
}
#[tauri::command]
pub async fn get_traffic(state: State<'_, ConnectionState>) -> Result<Value, String> {
    let connection = current(&state)?;
    fetch(&connection, "api/v1/stats/traffic").await
}
fn user_endpoint(limit: Option<u32>, offset: Option<u32>, query: Option<String>, user_state: Option<String>) -> Result<String, String> {
    let limit = limit.unwrap_or(100);
    if !(1..=500).contains(&limit) { return Err("Размер страницы должен быть от 1 до 500".into()); }
    let query = query.unwrap_or_default();
    if query.chars().count() > 100 { return Err("Поиск не длиннее 100 символов".into()); }
    let user_state = user_state.unwrap_or_else(|| "all".into());
    if !["all", "active", "expiring", "limited", "expired", "disabled", "attention"].contains(&user_state.as_str()) { return Err("Неизвестный фильтр пользователей".into()); }
    let mut url = Url::parse("https://placeholder.invalid/api/v1/users").map_err(|_| "Ошибка параметров".to_string())?;
    url.query_pairs_mut().append_pair("limit", &limit.to_string()).append_pair("offset", &offset.unwrap_or(0).to_string()).append_pair("q", &query).append_pair("state", &user_state);
    Ok(format!("api/v1/users?{}", url.query().unwrap_or_default()))
}
#[tauri::command]
pub async fn get_collection(kind: String, limit: Option<u32>, offset: Option<u32>, query: Option<String>, user_state: Option<String>, state: State<'_, ConnectionState>) -> Result<Value, String> {
    let has_parameters = limit.is_some() || offset.is_some() || query.is_some() || user_state.is_some();
    let endpoint = match kind.as_str() {
        "users" if has_parameters => user_endpoint(limit, offset, query, user_state)?,
        "users" => "api/v1/users".into(),
        "nodes" | "payments" if has_parameters => return Err("Параметры страниц реализованы только для пользователей".into()),
        "nodes" => "api/v1/nodes".into(),
        "payments" => "api/v1/payments".into(),
        _ => return Err("Неизвестный раздел".into()),
    };
    let connection = current(&state)?;
    fetch(&connection, &endpoint).await
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_invalid_settings() {
        assert!(prepare("http://example.com/admin", "test").is_err());
        assert!(prepare("https://user:pass@example.com/admin", "test").is_err());
        assert!(prepare("https://example.com/admin?token=x", "test").is_err());
        assert!(prepare("https://example.com/admin", "").is_err());
    }
    #[test]
    fn validates_and_encodes_user_parameters() {
        assert!(user_endpoint(Some(0), None, None, None).is_err());
        assert!(user_endpoint(Some(501), None, None, None).is_err());
        assert!(user_endpoint(None, None, None, Some("unknown".into())).is_err());
        assert!(user_endpoint(None, None, Some("x".repeat(101)), None).is_err());
        let path = user_endpoint(Some(25), Some(50), Some("тест & state=disabled".into()), Some("active".into())).unwrap();
        let url = Url::parse(&format!("https://example.com/{path}")).unwrap();
        let pairs: Vec<_> = url.query_pairs().collect();
        assert_eq!(pairs.len(), 4);
        assert!(pairs.iter().any(|(k,v)| k == "q" && v == "тест & state=disabled"));
        assert!(pairs.iter().any(|(k,v)| k == "state" && v == "active"));
    }
}
