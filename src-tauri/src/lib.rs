use notify::RecursiveMode;
use notify_debouncer_mini::new_debouncer;
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{Emitter, Manager, State};

#[derive(Serialize, Clone)]
struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    children: Option<Vec<FileEntry>>,
}

fn read_dir_recursive(dir: &Path) -> Vec<FileEntry> {
    let mut entries = Vec::new();

    if let Ok(read_dir) = fs::read_dir(dir) {
        for entry in read_dir.flatten() {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();

            // Skip hidden files/folders
            if name.starts_with('.') {
                continue;
            }

            let is_dir = path.is_dir();
            let children = if is_dir {
                Some(read_dir_recursive(&path))
            } else {
                None
            };

            entries.push(FileEntry {
                name,
                path: path.to_string_lossy().to_string(),
                is_dir,
                children,
            });
        }
    }

    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| {
        if a.is_dir && !b.is_dir {
            std::cmp::Ordering::Less
        } else if !a.is_dir && b.is_dir {
            std::cmp::Ordering::Greater
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    entries
}

#[tauri::command]
fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let dir = Path::new(&path);
    if !dir.exists() {
        return Err(format!("Directory not found: {}", path));
    }
    if !dir.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    Ok(read_dir_recursive(dir))
}

#[tauri::command]
fn read_md_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file {}: {}", path, e))
}

#[derive(Serialize)]
struct SearchMatch {
    line: usize,
    column: usize,
    snippet: String,
}

#[derive(Serialize)]
struct FileSearchResult {
    path: String,
    name: String,
    matches: Vec<SearchMatch>,
}

fn walk_md_files(dir: &Path, out: &mut Vec<std::path::PathBuf>) {
    if let Ok(read_dir) = fs::read_dir(dir) {
        for entry in read_dir.flatten() {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') {
                continue;
            }
            if path.is_dir() {
                walk_md_files(&path, out);
            } else if path.extension().and_then(|s| s.to_str()) == Some("md") {
                out.push(path);
            }
        }
    }
}

fn make_snippet(line: &str, col: usize, match_len: usize) -> String {
    let trimmed = line.trim();
    if trimmed.len() <= 240 {
        return trimmed.to_string();
    }
    // Build char-aware window around the match so we never split UTF-8.
    let before_ctx = 80;
    let after_ctx = 160;
    let start_byte = line
        .char_indices()
        .rev()
        .take_while(|(i, _)| *i > col.saturating_sub(before_ctx))
        .last()
        .map(|(i, _)| i)
        .unwrap_or(0);
    let end_byte = line
        .char_indices()
        .skip_while(|(i, _)| *i < col + match_len + after_ctx)
        .next()
        .map(|(i, _)| i)
        .unwrap_or(line.len());
    let slice = &line[start_byte..end_byte];
    let prefix = if start_byte > 0 { "…" } else { "" };
    let suffix = if end_byte < line.len() { "…" } else { "" };
    format!("{}{}{}", prefix, slice.trim(), suffix)
}

#[tauri::command]
fn search_directory(
    path: String,
    query: String,
    regex: Option<bool>,
    case_sensitive: Option<bool>,
) -> Result<Vec<FileSearchResult>, String> {
    let root = Path::new(&path);
    if !root.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    let q = query.trim();
    if q.is_empty() {
        return Ok(Vec::new());
    }
    let use_regex = regex.unwrap_or(false);
    let cs = case_sensitive.unwrap_or(false);

    enum Matcher {
        Literal { needle: String },
        Regex(::regex::Regex),
    }

    let matcher = if use_regex {
        let mut builder = ::regex::RegexBuilder::new(q);
        builder.case_insensitive(!cs);
        match builder.build() {
            Ok(re) => Matcher::Regex(re),
            Err(e) => return Err(format!("Invalid regex: {}", e)),
        }
    } else if cs {
        Matcher::Literal { needle: q.to_string() }
    } else {
        Matcher::Literal { needle: q.to_lowercase() }
    };

    let mut files = Vec::new();
    walk_md_files(root, &mut files);

    const MAX_MATCHES_PER_FILE: usize = 20;
    const MAX_FILES_IN_RESULT: usize = 200;

    let mut results = Vec::new();
    for file in files.into_iter().take(MAX_FILES_IN_RESULT * 4) {
        let Ok(content) = fs::read_to_string(&file) else { continue };
        let mut matches = Vec::new();
        for (idx, line) in content.lines().enumerate() {
            if matches.len() >= MAX_MATCHES_PER_FILE {
                break;
            }
            let hit = match &matcher {
                Matcher::Literal { needle } => {
                    if cs {
                        line.find(needle.as_str()).map(|c| (c, needle.len()))
                    } else {
                        line.to_lowercase().find(needle.as_str()).map(|c| (c, needle.len()))
                    }
                }
                Matcher::Regex(re) => re.find(line).map(|m| (m.start(), m.end() - m.start())),
            };
            if let Some((col, len)) = hit {
                matches.push(SearchMatch {
                    line: idx + 1,
                    column: col + 1,
                    snippet: make_snippet(line, col, len),
                });
            }
        }
        if !matches.is_empty() {
            let name = file
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_default();
            results.push(FileSearchResult {
                path: file.to_string_lossy().to_string(),
                name,
                matches,
            });
            if results.len() >= MAX_FILES_IN_RESULT {
                break;
            }
        }
    }

    Ok(results)
}

// ---- File watcher ----

type DebouncerHandle = notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>;

struct WatcherState {
    debouncer: Option<DebouncerHandle>,
    watched: HashMap<PathBuf, usize>,
}

impl WatcherState {
    fn new() -> Self {
        Self { debouncer: None, watched: HashMap::new() }
    }
}

#[tauri::command]
fn watch_folder(
    path: String,
    state: State<'_, Mutex<WatcherState>>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if !p.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    let mut ws = state.lock().map_err(|e| e.to_string())?;
    if ws.debouncer.is_none() {
        let emitter = app.clone();
        let debouncer = new_debouncer(Duration::from_millis(500), move |res: notify_debouncer_mini::DebounceEventResult| {
            if let Ok(events) = res {
                let mut roots: Vec<String> = events
                    .into_iter()
                    .map(|e| e.path.to_string_lossy().to_string())
                    .collect();
                roots.sort();
                roots.dedup();
                let _ = emitter.emit("folder-changed", roots);
            }
        })
        .map_err(|e| e.to_string())?;
        ws.debouncer = Some(debouncer);
    }
    let count = ws.watched.get(&p).copied().unwrap_or(0);
    if count == 0 {
        if let Some(d) = ws.debouncer.as_mut() {
            d.watcher().watch(&p, RecursiveMode::Recursive).map_err(|e| e.to_string())?;
        }
    }
    ws.watched.insert(p, count + 1);
    Ok(())
}

#[tauri::command]
fn unwatch_folder(path: String, state: State<'_, Mutex<WatcherState>>) -> Result<(), String> {
    let p = PathBuf::from(&path);
    let mut ws = state.lock().map_err(|e| e.to_string())?;
    if let Some(n) = ws.watched.get_mut(&p) {
        if *n > 0 { *n -= 1; }
        if *n == 0 {
            if let Some(d) = ws.debouncer.as_mut() {
                let _ = d.watcher().unwatch(&p);
            }
            ws.watched.remove(&p);
        }
    }
    Ok(())
}

// ---- Error log ----

#[tauri::command]
fn append_error_log(message: String, app: tauri::AppHandle) -> Result<(), String> {
    use std::io::Write;
    let dir = app.path().app_log_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let file_path = dir.join("mdlabs-errors.log");
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&file_path)
        .map_err(|e| e.to_string())?;
    let ts = chrono_like_timestamp();
    writeln!(file, "[{}] {}", ts, message).map_err(|e| e.to_string())?;
    Ok(())
}

fn chrono_like_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    // Minimal ISO-ish: just epoch seconds to avoid pulling chrono
    format!("{}", secs)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(Mutex::new(WatcherState::new()))
        .invoke_handler(tauri::generate_handler![
            read_directory,
            read_md_file,
            search_directory,
            watch_folder,
            unwatch_folder,
            append_error_log
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
