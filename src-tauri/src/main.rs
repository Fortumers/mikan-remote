#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod mikan;
fn main() {
    tauri::Builder::default()
        .manage(mikan::ConnectionState::default())
        .invoke_handler(tauri::generate_handler![mikan::connect_panel, mikan::disconnect_panel, mikan::get_overview, mikan::get_traffic])
        .run(tauri::generate_context!())
        .expect("error while running PumbaNET Admin");
}
