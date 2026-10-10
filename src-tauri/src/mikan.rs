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
        403 => return Err("Недостаточно прав API-ключа".into()),
        404 => return Err("API не найден. Проверьте секретный путь и версию Mikan".into()),
        300..=399 => return Err("Панель перенаправляет запрос. Укажите конечный HTTPS-адрес".into()),
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

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_http_and_embedded_credentials() {
        assert!(prepare("http://example.com/admin", "test").is_err());
        assert!(prepare("https://user:pass@example.com/admin", "test").is_err());
        assert!(prepare("https://example.com/admin?token=x", "test").is_err());
        assert!(prepare("https://example.com/admin", "").is_err());
    }
}
