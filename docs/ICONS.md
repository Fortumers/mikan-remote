# App icons

app-icon.svg — исходная квадратная иконка PumbaNET (оранжевая P). Перед tauri dev/build команда Tauri icon генерирует платформенные иконки в src-tauri/icons. Это исправляет отсутствие icon.ico для ресурсов Windows. Генерация и Rust-сборка ещё не проверены на ПК.

После обновления app-icon.svg и src-tauri/tauri.conf.json запускать npm.cmd run tauri dev. Не удалять target и node_modules.

Для отдельной генерации (например перед прямым cargo check/test) из корня проекта:

```powershell
npm.cmd run tauri -- icon app-icon.svg
```

Иконки нужны и при bundle.active=false: Windows-ресурсы создаются для самого приложения, не только установщика.
