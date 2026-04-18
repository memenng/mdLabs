use serde::Serialize;
use std::fs;
use std::path::Path;

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

#[tauri::command]
fn search_directory(path: String, query: String) -> Result<Vec<FileSearchResult>, String> {
    let root = Path::new(&path);
    if !root.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    let q = query.trim();
    if q.is_empty() {
        return Ok(Vec::new());
    }
    let q_lower = q.to_lowercase();

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
            let line_lower = line.to_lowercase();
            if let Some(col) = line_lower.find(&q_lower) {
                let trimmed = line.trim();
                let snippet = if trimmed.len() > 160 {
                    let start = col.saturating_sub(60);
                    let end = (col + q.len() + 100).min(line.len());
                    format!("…{}…", &line[start..end])
                } else {
                    trimmed.to_string()
                };
                matches.push(SearchMatch {
                    line: idx + 1,
                    column: col + 1,
                    snippet,
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![read_directory, read_md_file, search_directory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
