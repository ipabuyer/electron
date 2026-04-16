use reqwest::Client;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::env;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

const DB_FILE: &str = "PurchasedAppDb.db";
const PASSPHRASE_FILE: &str = "passphrase.txt";
const SETTINGS_FILE: &str = "settings.json";

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct AuthState {
    pub email: String,
    pub logged_in: bool,
    pub is_test: bool,
    pub passphrase: String,
}

#[derive(Default)]
pub struct DownloadController {
    pub canceled: bool,
    pub skip_current: bool,
    pub child: Option<Arc<Mutex<Child>>>,
}

#[derive(Default)]
pub struct AppState {
    pub auth: Mutex<AuthState>,
    pub download: Mutex<DownloadController>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppStatusRow {
    #[serde(rename = "bundleId")]
    pub bundle_id: String,
    #[serde(rename = "appName", default)]
    pub app_name: String,
    #[serde(default)]
    pub email: String,
    pub status: String,
    #[serde(rename = "updatedAt", default)]
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginPayload {
    pub email: String,
    pub password: String,
    #[serde(rename = "authCode", default)]
    pub auth_code: String,
    #[serde(default)]
    pub passphrase: String,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct AuthInfoPayload {
    #[serde(default)]
    pub passphrase: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PurchasePayload {
    #[serde(rename = "bundleIds", default)]
    pub bundle_ids: Vec<String>,
    #[serde(default)]
    pub passphrase: String,
    #[serde(rename = "appNameMap", default)]
    pub app_name_map: serde_json::Map<String, Value>,
    #[serde(default)]
    pub email: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadPayload {
    #[serde(rename = "bundleIds", default)]
    pub bundle_ids: Vec<String>,
    #[serde(default)]
    pub passphrase: String,
    #[serde(rename = "outputDir", default)]
    pub output_dir: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ItunesSearchPayload {
    pub term: String,
    pub entity: String,
    pub limit: u32,
    pub country: String,
}

#[derive(Debug, Clone, Serialize)]
struct DownloadLogPayload {
    #[serde(rename = "bundleId")]
    bundle_id: String,
    line: String,
    stream: String,
}

#[derive(Debug)]
struct CommandResult {
    code: i32,
    stdout: String,
    stderr: String,
    output: String,
    canceled: bool,
}

fn get_base_dir() -> Result<PathBuf, String> {
    let local_data = env::var("LOCALAPPDATA")
        .map(PathBuf::from)
        .or_else(|_| {
            dirs::home_dir()
                .map(|path| path.join("AppData").join("Local"))
                .ok_or(env::VarError::NotPresent)
        })
        .map_err(|_| "无法定位 LOCALAPPDATA".to_string())?;
    if cfg!(debug_assertions) {
        return Ok(local_data.join("IPAbuyer"));
    }
    Ok(local_data
        .join("Packages")
        .join("IPAbuyer.IPAbuyer_kr1hdvrv6tpd0")
        .join("LocalState"))
}

fn ensure_base_dir() -> Result<PathBuf, String> {
    let dir = get_base_dir()?;
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}

fn db_path() -> Result<PathBuf, String> {
    Ok(ensure_base_dir()?.join(DB_FILE))
}

fn passphrase_path() -> Result<PathBuf, String> {
    Ok(ensure_base_dir()?.join(PASSPHRASE_FILE))
}

fn settings_path() -> Result<PathBuf, String> {
    Ok(ensure_base_dir()?.join(SETTINGS_FILE))
}

fn open_db() -> Result<Connection, String> {
    let conn = Connection::open(db_path()?).map_err(|error| error.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS apps (
            bundleId TEXT PRIMARY KEY,
            appName TEXT,
            email TEXT,
            status TEXT,
            updatedAt TEXT
        )",
        [],
    )
    .map_err(|error| error.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS accounts (
            email TEXT PRIMARY KEY,
            password TEXT
        )",
        [],
    )
    .map_err(|error| error.to_string())?;
    conn.execute(
        "INSERT OR IGNORE INTO accounts (email, password) VALUES (?1, ?2)",
        params!["test", "test"],
    )
    .map_err(|error| error.to_string())?;
    Ok(conn)
}

fn read_settings() -> Result<Value, String> {
    let path = settings_path()?;
    if !path.exists() {
        return Ok(json!({}));
    }
    let raw = fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str(&raw).map_err(|error| error.to_string())
}

fn write_settings(value: &Value) -> Result<bool, String> {
    let content = serde_json::to_string_pretty(value).map_err(|error| error.to_string())?;
    fs::write(settings_path()?, content).map_err(|error| error.to_string())?;
    Ok(true)
}

fn now_text() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

fn default_downloads_dir() -> String {
    dirs::download_dir()
        .or_else(dirs::home_dir)
        .unwrap_or_else(|| PathBuf::from("."))
        .to_string_lossy()
        .to_string()
}

fn read_download_dir() -> Result<String, String> {
    let settings = read_settings()?;
    let value = settings
        .get("downloadPath")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim()
        .to_string();
    if value.is_empty() {
        return Ok(default_downloads_dir());
    }
    Ok(value)
}

fn set_auth_state(state: &State<AppState>, next: AuthState) -> Result<(), String> {
    let mut guard = state.auth.lock().map_err(|_| "auth state lock failed".to_string())?;
    *guard = next;
    Ok(())
}

fn get_auth_state(state: &State<AppState>) -> Result<AuthState, String> {
    state
        .auth
        .lock()
        .map_err(|_| "auth state lock failed".to_string())
        .map(|guard| guard.clone())
}

fn get_ipatool_path(app: &AppHandle) -> Result<PathBuf, String> {
    let arch = env::consts::ARCH;
    let name = if arch == "aarch64" {
        "ipatool-2.2.0-windows-arm64.exe"
    } else {
        "ipatool-2.2.0-windows-amd64.exe"
    };
    if cfg!(debug_assertions) {
        let current_dir = env::current_dir().map_err(|error| error.to_string())?;
        return Ok(current_dir.join("include").join(name));
    }
    app.path()
        .resource_dir()
        .map(|path| path.join("include").join(name))
        .map_err(|error| error.to_string())
}

fn strip_ansi(text: &str) -> String {
    let mut output = String::new();
    let mut escaping = false;
    for ch in text.chars() {
        if ch == '\u{1b}' {
            escaping = true;
            continue;
        }
        if escaping {
            if ch.is_ascii_alphabetic() {
                escaping = false;
            }
            continue;
        }
        output.push(ch);
    }
    output
}

fn run_command(app: &AppHandle, args: &[String]) -> Result<CommandResult, String> {
    let ipatool = get_ipatool_path(app)?;
    if !ipatool.exists() {
        let message = format!("ipatool.exe not found at {}", ipatool.display());
        return Ok(CommandResult {
            code: -1,
            stdout: String::new(),
            stderr: message.clone(),
            output: message,
            canceled: false,
        });
    }
    let output = Command::new(ipatool)
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|error| error.to_string())?;
    let stdout = strip_ansi(&String::from_utf8_lossy(&output.stdout)).trim().to_string();
    let stderr = strip_ansi(&String::from_utf8_lossy(&output.stderr)).trim().to_string();
    Ok(CommandResult {
        code: output.status.code().unwrap_or(-1),
        stdout: stdout.clone(),
        stderr: stderr.clone(),
        output: format!("{}\n{}", stdout, stderr).trim().to_string(),
        canceled: false,
    })
}

fn run_command_stream(
    app: &AppHandle,
    state: &State<AppState>,
    bundle_id: &str,
    args: &[String],
) -> Result<CommandResult, String> {
    let ipatool = get_ipatool_path(app)?;
    if !ipatool.exists() {
        let message = format!("ipatool.exe not found at {}", ipatool.display());
        return Ok(CommandResult {
            code: -1,
            stdout: String::new(),
            stderr: message.clone(),
            output: message,
            canceled: false,
        });
    }
    let mut child = Command::new(ipatool)
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| error.to_string())?;
    let stdout = child.stdout.take().ok_or_else(|| "stdout unavailable".to_string())?;
    let stderr = child.stderr.take().ok_or_else(|| "stderr unavailable".to_string())?;
    let child_ref = Arc::new(Mutex::new(child));
    {
        let mut guard = state.download.lock().map_err(|_| "download state lock failed".to_string())?;
        guard.child = Some(child_ref.clone());
    }

    let stdout_lines = Arc::new(Mutex::new(Vec::<String>::new()));
    let stderr_lines = Arc::new(Mutex::new(Vec::<String>::new()));

    let app_stdout = app.clone();
    let stdout_target = stdout_lines.clone();
    let stdout_bundle = bundle_id.to_string();
    let stdout_thread = std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().map_while(Result::ok) {
            let cleaned = strip_ansi(&line).trim().to_string();
            if cleaned.is_empty() {
                continue;
            }
            if let Ok(mut guard) = stdout_target.lock() {
                guard.push(cleaned.clone());
            }
            let _ = app_stdout.emit(
                "download:log",
                DownloadLogPayload {
                    bundle_id: stdout_bundle.clone(),
                    line: cleaned,
                    stream: "stdout".to_string(),
                },
            );
        }
    });

    let app_stderr = app.clone();
    let stderr_target = stderr_lines.clone();
    let stderr_bundle = bundle_id.to_string();
    let stderr_thread = std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().map_while(Result::ok) {
            let cleaned = strip_ansi(&line).trim().to_string();
            if cleaned.is_empty() {
                continue;
            }
            if let Ok(mut guard) = stderr_target.lock() {
                guard.push(cleaned.clone());
            }
            let _ = app_stderr.emit(
                "download:log",
                DownloadLogPayload {
                    bundle_id: stderr_bundle.clone(),
                    line: cleaned,
                    stream: "stderr".to_string(),
                },
            );
        }
    });

    let status = child_ref
        .lock()
        .map_err(|_| "child lock failed".to_string())?
        .wait()
        .map_err(|error| error.to_string())?;

    let _ = stdout_thread.join();
    let _ = stderr_thread.join();

    let stdout = stdout_lines
        .lock()
        .map_err(|_| "stdout lock failed".to_string())?
        .join("\n");
    let stderr = stderr_lines
        .lock()
        .map_err(|_| "stderr lock failed".to_string())?
        .join("\n");

    let canceled = {
        let mut guard = state.download.lock().map_err(|_| "download state lock failed".to_string())?;
        let canceled = guard.canceled;
        guard.child = None;
        canceled
    };

    Ok(CommandResult {
        code: status.code().unwrap_or(-1),
        stdout: stdout.clone(),
        stderr: stderr.clone(),
        output: format!("{}\n{}", stdout, stderr).trim().to_string(),
        canceled,
    })
}

fn is_test_account(email: &str, password: &str) -> bool {
    email == "test" && password == "test"
}

#[tauri::command]
pub fn db_list() -> Result<Vec<AppStatusRow>, String> {
    let conn = open_db()?;
    let mut stmt = conn
        .prepare("SELECT bundleId, appName, email, status, updatedAt FROM apps ORDER BY updatedAt DESC")
        .map_err(|error| error.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(AppStatusRow {
                bundle_id: row.get(0)?,
                app_name: row.get(1)?,
                email: row.get(2)?,
                status: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|error| error.to_string())?;
    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|error| error.to_string())?);
    }
    Ok(items)
}

#[tauri::command]
pub fn db_set_many(payload: Vec<AppStatusRow>) -> Result<Vec<AppStatusRow>, String> {
    let mut conn = open_db()?;
    let tx = conn.transaction().map_err(|error| error.to_string())?;
    let now = now_text();
    for row in payload {
        if row.bundle_id.trim().is_empty() {
            continue;
        }
        if row.status != "purchased" && row.status != "owned" {
            continue;
        }
        tx.execute(
            "INSERT INTO apps (bundleId, appName, email, status, updatedAt)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(bundleId) DO UPDATE SET
               appName=excluded.appName,
               email=excluded.email,
               status=excluded.status,
               updatedAt=excluded.updatedAt",
            params![row.bundle_id, row.app_name, row.email, row.status, now],
        )
        .map_err(|error| error.to_string())?;
    }
    tx.commit().map_err(|error| error.to_string())?;
    db_list()
}

#[tauri::command]
pub fn db_delete_many(payload: Vec<String>) -> Result<Vec<AppStatusRow>, String> {
    let mut conn = open_db()?;
    let tx = conn.transaction().map_err(|error| error.to_string())?;
    for bundle_id in payload {
        tx.execute("DELETE FROM apps WHERE bundleId = ?1", params![bundle_id])
            .map_err(|error| error.to_string())?;
    }
    tx.commit().map_err(|error| error.to_string())?;
    db_list()
}

#[tauri::command]
pub fn db_clear() -> Result<Value, String> {
    let path = db_path()?;
    if path.exists() {
        fs::remove_file(path).map_err(|error| error.to_string())?;
    }
    let _ = open_db()?;
    Ok(json!({ "ok": true }))
}

#[tauri::command]
pub fn passphrase_read() -> Result<String, String> {
    let path = passphrase_path()?;
    if !path.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(path).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn passphrase_write(value: String) -> Result<bool, String> {
    fs::write(passphrase_path()?, value).map_err(|error| error.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn country_read() -> Result<String, String> {
    Ok(read_settings()?
        .get("country")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim()
        .to_string())
}

#[tauri::command]
pub fn country_write(value: String) -> Result<bool, String> {
    let mut settings = read_settings()?;
    settings["country"] = Value::String(value.trim().to_string());
    write_settings(&settings)
}

#[tauri::command]
pub fn download_path_read() -> Result<String, String> {
    read_download_dir()
}

#[tauri::command]
pub fn download_path_write(value: String) -> Result<bool, String> {
    let mut settings = read_settings()?;
    settings["downloadPath"] = Value::String(value.trim().to_string());
    write_settings(&settings)
}

#[tauri::command]
pub fn app_open_path(value: String) -> Result<Value, String> {
    let path = Path::new(&value);
    if !path.exists() {
        return Ok(json!({ "ok": false, "error": "path not found" }));
    }
    open::that(path).map_err(|error| error.to_string())?;
    Ok(json!({ "ok": true }))
}

#[tauri::command]
pub fn app_open_external(url: String) -> Result<Value, String> {
    open::that(url).map_err(|error| error.to_string())?;
    Ok(json!({ "ok": true }))
}

#[tauri::command]
pub fn auth_login(app: AppHandle, state: State<AppState>, payload: LoginPayload) -> Result<Value, String> {
    if is_test_account(&payload.email, &payload.password) {
        set_auth_state(
            &state,
            AuthState {
                email: payload.email.clone(),
                logged_in: true,
                is_test: true,
                passphrase: payload.passphrase.clone(),
            },
        )?;
        let _ = passphrase_write(payload.passphrase);
        return Ok(json!({ "ok": true, "mock": true, "message": "测试账户登录成功（模拟）" }));
    }

    let mut args = vec![
        "auth".to_string(),
        "login".to_string(),
        "--email".to_string(),
        payload.email.clone(),
        "--password".to_string(),
        payload.password.clone(),
        "--keychain-passphrase".to_string(),
        payload.passphrase.clone(),
        "--format".to_string(),
        "text".to_string(),
    ];
    if !payload.auth_code.trim().is_empty() {
        args.push("--auth-code".to_string());
        args.push(payload.auth_code.clone());
    }
    let result = run_command(&app, &args)?;
    if result.code == 0 {
        set_auth_state(
            &state,
            AuthState {
                email: payload.email,
                logged_in: true,
                is_test: false,
                passphrase: payload.passphrase.clone(),
            },
        )?;
        let _ = passphrase_write(payload.passphrase);
    }
    Ok(json!({
        "ok": result.code == 0,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "output": result.output
    }))
}

#[tauri::command]
pub fn auth_info(app: AppHandle, state: State<AppState>, payload: AuthInfoPayload) -> Result<Value, String> {
    let auth = get_auth_state(&state)?;
    if auth.is_test && auth.logged_in {
        return Ok(json!({
            "ok": true,
            "mock": true,
            "message": "测试账户处于登录状态",
            "email": auth.email
        }));
    }
    let passphrase = if payload.passphrase.trim().is_empty() {
        auth.passphrase.clone()
    } else {
        payload.passphrase
    };
    let result = run_command(
        &app,
        &[
            "auth".to_string(),
            "info".to_string(),
            "--keychain-passphrase".to_string(),
            passphrase,
            "--format".to_string(),
            "text".to_string(),
        ],
    )?;
    Ok(json!({
        "ok": result.code == 0,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "output": result.output,
        "email": auth.email
    }))
}

#[tauri::command]
pub fn auth_revoke(app: AppHandle, state: State<AppState>) -> Result<Value, String> {
    let auth = get_auth_state(&state)?;
    if auth.is_test && auth.logged_in {
        set_auth_state(&state, AuthState::default())?;
        return Ok(json!({ "ok": true, "mock": true, "message": "测试账户已登出" }));
    }
    let result = run_command(
        &app,
        &["auth".to_string(), "revoke".to_string(), "--format".to_string(), "text".to_string()],
    )?;
    if result.code == 0 {
        set_auth_state(&state, AuthState::default())?;
    }
    Ok(json!({
        "ok": result.code == 0,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "output": result.output
    }))
}

#[tauri::command]
pub fn ipatool_purchase(app: AppHandle, state: State<AppState>, payload: PurchasePayload) -> Result<Value, String> {
    if payload.bundle_ids.is_empty() {
        return Ok(json!({ "ok": false, "message": "No bundleIds provided", "results": [] }));
    }
    let auth = get_auth_state(&state)?;
    if auth.is_test {
        let results: Vec<Value> = payload
            .bundle_ids
            .iter()
            .map(|bundle_id| json!({ "bundleId": bundle_id, "ok": true, "stdout": "测试账户购买成功" }))
            .collect();
        return Ok(json!({ "ok": true, "mock": true, "results": results }));
    }

    let passphrase = if payload.passphrase.trim().is_empty() {
        auth.passphrase.clone()
    } else {
        payload.passphrase.clone()
    };
    let mut results = Vec::new();
    let mut owned_apps = Vec::new();
    let mut rows = Vec::new();

    for bundle_id in &payload.bundle_ids {
        let result = run_command(
            &app,
            &[
                "purchase".to_string(),
                "--keychain-passphrase".to_string(),
                passphrase.clone(),
                "--bundle-identifier".to_string(),
                bundle_id.clone(),
                "--format".to_string(),
                "text".to_string(),
            ],
        )?;
        let ok = result.code == 0;
        let merged = format!("{}\n{}", result.stdout, result.stderr).to_lowercase();
        if ok || merged.contains("stdq") || merged.contains("already") || merged.contains("owned") {
            let status = if ok { "purchased" } else { "owned" };
            let row = AppStatusRow {
                bundle_id: bundle_id.clone(),
                app_name: payload
                    .app_name_map
                    .get(bundle_id)
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .to_string(),
                email: if auth.email.is_empty() { payload.email.clone() } else { auth.email.clone() },
                status: status.to_string(),
                updated_at: String::new(),
            };
            if status == "owned" {
                owned_apps.push(json!({ "bundleId": row.bundle_id.clone(), "appName": row.app_name.clone() }));
            }
            rows.push(row);
        }
        results.push(json!({
            "bundleId": bundle_id,
            "ok": ok,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "output": result.output
        }));
    }
    if !rows.is_empty() {
        let _ = db_set_many(rows)?;
    }
    Ok(json!({
        "ok": results.iter().all(|item| item.get("ok").and_then(Value::as_bool).unwrap_or(false)),
        "results": results,
        "ownedApps": owned_apps
    }))
}

#[tauri::command]
pub fn ipatool_download(app: AppHandle, state: State<AppState>, payload: DownloadPayload) -> Result<Value, String> {
    if payload.bundle_ids.is_empty() {
        return Ok(json!({ "ok": false, "message": "No bundleIds provided", "results": [] }));
    }
    let auth = get_auth_state(&state)?;
    let passphrase = if payload.passphrase.trim().is_empty() {
        auth.passphrase.clone()
    } else {
        payload.passphrase.clone()
    };
    let output_dir = if payload.output_dir.trim().is_empty() {
        read_download_dir()?
    } else {
        payload.output_dir.clone()
    };
    fs::create_dir_all(&output_dir).map_err(|error| error.to_string())?;

    {
        let mut guard = state.download.lock().map_err(|_| "download state lock failed".to_string())?;
        guard.canceled = false;
        guard.skip_current = false;
        guard.child = None;
    }

    if auth.is_test {
        let mut results = Vec::new();
        for bundle_id in &payload.bundle_ids {
            let target = Path::new(&output_dir).join(format!("{bundle_id}.ipa"));
            fs::write(&target, "mock ipa content").map_err(|error| error.to_string())?;
            let line = format!("测试账户下载成功 -> {}", target.display());
            let _ = app.emit(
                "download:log",
                DownloadLogPayload {
                    bundle_id: bundle_id.clone(),
                    line: line.clone(),
                    stream: "summary".to_string(),
                },
            );
            results.push(json!({
                "bundleId": bundle_id,
                "ok": true,
                "stdout": line,
                "target": target.to_string_lossy()
            }));
        }
        return Ok(json!({ "ok": true, "mock": true, "results": results, "outputDir": output_dir }));
    }

    let mut results = Vec::new();
    for bundle_id in &payload.bundle_ids {
        {
            let guard = state.download.lock().map_err(|_| "download state lock failed".to_string())?;
            if guard.canceled {
                return Ok(json!({ "ok": false, "canceled": true, "results": results, "outputDir": output_dir }));
            }
        }
        let skip_current = {
            let mut guard = state.download.lock().map_err(|_| "download state lock failed".to_string())?;
            let skip = guard.skip_current;
            if skip {
                guard.skip_current = false;
            }
            skip
        };
        if skip_current {
            results.push(json!({ "bundleId": bundle_id, "ok": false, "skipped": true, "stdout": "skipped" }));
            continue;
        }
        let target = Path::new(&output_dir).join(format!("{bundle_id}.ipa"));
        let result = run_command_stream(
            &app,
            &state,
            bundle_id,
            &[
                "download".to_string(),
                "--keychain-passphrase".to_string(),
                passphrase.clone(),
                "--output".to_string(),
                target.to_string_lossy().to_string(),
                "--bundle-identifier".to_string(),
                bundle_id.clone(),
                "--format".to_string(),
                "text".to_string(),
            ],
        )?;
        results.push(json!({
            "bundleId": bundle_id,
            "ok": result.code == 0 && !result.canceled,
            "canceled": result.canceled,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "output": result.output,
            "target": target.to_string_lossy()
        }));
    }
    Ok(json!({
        "ok": results.iter().all(|item| item.get("ok").and_then(Value::as_bool).unwrap_or(false)),
        "results": results,
        "outputDir": output_dir
    }))
}

#[tauri::command]
pub fn ipatool_download_cancel(state: State<AppState>) -> Result<Value, String> {
    let child = {
        let mut guard = state.download.lock().map_err(|_| "download state lock failed".to_string())?;
        guard.canceled = true;
        guard.child.clone()
    };
    if let Some(child) = child {
        if let Ok(mut process) = child.lock() {
            let _ = process.kill();
        }
        return Ok(json!({ "ok": true }));
    }
    Ok(json!({ "ok": false, "error": "no active download" }))
}

#[tauri::command]
pub fn ipatool_download_cancel_current(state: State<AppState>) -> Result<Value, String> {
    let child = {
        let mut guard = state.download.lock().map_err(|_| "download state lock failed".to_string())?;
        guard.skip_current = true;
        guard.child.clone()
    };
    if let Some(child) = child {
        if let Ok(mut process) = child.lock() {
            let _ = process.kill();
        }
        return Ok(json!({ "ok": true }));
    }
    Ok(json!({ "ok": false, "error": "no active download" }))
}

#[tauri::command]
pub async fn itunes_search(params: ItunesSearchPayload) -> Result<Value, String> {
    let response = Client::new()
        .get("https://itunes.apple.com/search")
        .query(&[
            ("term", params.term),
            ("entity", params.entity),
            ("limit", params.limit.to_string()),
            ("country", params.country),
        ])
        .send()
        .await
        .map_err(|error| error.to_string())?;
    let data: Value = response.json().await.map_err(|error| error.to_string())?;
    Ok(json!({ "ok": true, "data": data }))
}
