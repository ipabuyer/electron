mod command;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(command::AppState::default())
        .invoke_handler(tauri::generate_handler![
            command::db_list,
            command::db_set_many,
            command::db_delete_many,
            command::db_clear,
            command::passphrase_read,
            command::passphrase_write,
            command::country_read,
            command::country_write,
            command::download_path_read,
            command::download_path_write,
            command::app_open_path,
            command::app_open_external,
            command::auth_login,
            command::auth_info,
            command::auth_revoke,
            command::ipatool_purchase,
            command::ipatool_download,
            command::ipatool_download_cancel,
            command::ipatool_download_cancel_current,
            command::itunes_search
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
