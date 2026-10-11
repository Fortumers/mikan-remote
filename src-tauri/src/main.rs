#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod mikan {
    include!("mikan.rs");
    pub mod management { include!("management.rs"); }
    pub mod editing { include!("editing.rs"); }
    pub mod server_catalog { include!("server_catalog.rs"); }
    pub mod inbound_control { include!("inbound_control.rs"); }
}
fn main() {
    tauri::Builder::default()
        .manage(mikan::ConnectionState::default())
        .invoke_handler(tauri::generate_handler![mikan::connect_panel, mikan::disconnect_panel, mikan::get_overview, mikan::get_traffic, mikan::get_collection, mikan::management::get_tariffs, mikan::management::create_user, mikan::editing::get_editable_user, mikan::editing::update_user, mikan::server_catalog::get_server_catalog, mikan::inbound_control::set_inbound_enabled])
        .run(tauri::generate_context!())
        .expect("error while running Mikan Remote");
}
