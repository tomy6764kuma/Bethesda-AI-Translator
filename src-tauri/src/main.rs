// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;

#[tauri::command]
fn save_xml_file(default_name: String, content: String) -> Result<String, String> {
  let file_path = rfd::FileDialog::new()
    .set_file_name(&default_name)
    .add_filter("XML Document", &["xml"])
    .save_file();

  if let Some(path) = file_path {
    match fs::write(&path, content) {
      Ok(_) => Ok(path.to_string_lossy().to_string()),
      Err(err) => Err(err.to_string()),
    }
  } else {
    Err("cancelled".to_string())
  }
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_http::init())
    .invoke_handler(tauri::generate_handler![save_xml_file])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
