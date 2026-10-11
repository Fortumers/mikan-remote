#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod mikan {
    include!("mikan.rs");
    pub mod management { include!("management.rs"); }
    pub mod editing { include!("editing.rs"); }
    pub mod server_catalog { include!("server_catalog.rs"); }
}
fn main() {
    tauri::Builder::default()
        .manage(mikan::ConnectionState::default())
        .invoke_handler(tauri::generate_handler![mikan::connect_panel, mikan::disconnect_panel, mikan::get_overview, mikan::get_traffic, mikan::get_collection, mikan::management::get_tariffs, mikan::management::create_user, mikan::editing::get_editable_user, mikan::editing::update_user, mikan::server_catalog::get_server_catalog])
        .run(tauri::generate_context!())
        .expect("error while running Mikan Remote");
}
