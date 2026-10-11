use super::{current, fetch, ConnectionState};
use serde_json::{Map, Value};
use tauri::State;
#[tauri::command]
pub async fn get_server_catalog(kind: String, state: State<'_, ConnectionState>) -> Result<Value, String> {
    let (endpoint, fields): (&str, &[&str]) = match kind.as_str() {
        "nodes" => ("api/v1/nodes", &["id", "name", "enabled", "status"]),
        "inbounds" => ("api/v1/inbounds", &["id", "node_id", "name", "preset", "title", "enabled", "network", "port"]),
        "presets" => ("api/v1/presets", &["id", "name", "title", "protocol", "network", "description"]),
        _ => return Err("Неизвестный каталог".into()),
    };
    let value = fetch(&current(&state)?, endpoint).await?;
    let rows = value.as_array().ok_or_else(|| "Неподдерживаемая схема каталога Mikan".to_string())?;
    let mut result = Vec::new();
    for row in rows {
        let obj = row.as_object().ok_or_else(|| "Некорректная запись каталога".to_string())?;
        let mut safe = Map::new();
        for &field in fields {
            if let Some(v) = obj.get(field) {
                if v.is_string() || v.is_number() || v.is_boolean() || v.is_null() { safe.insert(field.into(), v.clone()); }
            }
        }
        result.push(Value::Object(safe));
    }
    Ok(Value::Array(result))
}
