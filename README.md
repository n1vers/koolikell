# SchoolBell

SchoolBell — Windows-приложение для автоматических школьных звонков, расписаний, профилей дней и воспроизведения музыки.

## Возможности

- профили расписаний;
- недельное назначение профиля по будним дням;
- исключения профиля на конкретную дату;
- автоматические звонки и предзвон;
- отдельный звук для предзвона;
- настройка времени предзвона;
- NTP-проверка времени через `ntp1.eenet.ee`;
- журнал событий и звонков;
- страница звуков с загрузкой через drag-and-drop;
- PlayNow-плейлист с загрузкой файлов, drag-and-drop сортировкой, timeline и режимами повтора;
- запуск в системном трее и автозапуск Windows;
- NSIS-установщик для Windows.

## Требования

- Windows 10/11;
- Node.js 20 или новее;
- npm.

## Запуск В Разработке

Из корня проекта:

```powershell
npm install
npm --prefix client install
npm --prefix server install
npm run electron
```

Окно Electron загрузит клиент через Vite, а backend будет запущен на `http://localhost:3000`.

Не запускайте одновременно отдельный `server\npm run dev` и `npm run electron`, иначе порт `3000` будет занят.

## Сборка Windows

Создать production installer:

```powershell
npm run dist:win
```

Результаты:

```text
release/SchoolBell Setup 1.0.0.exe
release/win-unpacked/SchoolBell.exe
```

`SchoolBell Setup 1.0.0.exe` — обычный установщик. `SchoolBell.exe` из `win-unpacked` — portable-вариант для локальной проверки.

## Иконка

Windows-иконка находится здесь:

```text
build/icon.ico
```

Для electron-builder нужна ICO-иконка размером минимум `256x256`. Путь подключён в `package.json`.

## Данные И Папки

- `server/sounds` — звуки школьных звонков;
- `server/playnow` — треки PlayNow;
- `server/schoolbell.db` — локальная SQLite-база;
- `release` — готовые installer-файлы;
- `dist-electron` и `client/dist` — промежуточные build-файлы.

Папки с зависимостями, базой, загруженными файлами и сборками не добавляются в Git.

## Проверка Сборок

```powershell
npm --prefix client run build
npm --prefix server run build
npm run electron:build
```

Полная сборка Windows:

```powershell
npm run dist:win
```

## Публикация На GitHub

Исходный код пушится в репозиторий, а `.exe` лучше публиковать как GitHub Release.

### 1. Создать репозиторий

Создайте пустой репозиторий на GitHub, например `schoolbell`.

Затем из корня проекта:

```powershell
git remote add origin https://github.com/YOUR_NAME/schoolbell.git
git add .
git commit -m "Initial SchoolBell release"
git branch -M main
git push -u origin main
```

Замените `YOUR_NAME` на имя своего GitHub-пользователя.

### 2. Создать установщик

```powershell
npm run dist:win
```

### 3. Создать Release

На странице GitHub:

1. Откройте вкладку **Releases**.
2. Нажмите **Draft a new release**.
3. Создайте тег, например `v1.0.0`.
4. Добавьте заголовок `SchoolBell v1.0.0`.
5. Перетащите файл `release/SchoolBell Setup 1.0.0.exe` в поле assets.
6. Нажмите **Publish release**.

Пользователи смогут скачать установщик из раздела Releases. Папка `release` не пушится в обычный Git-коммит, потому что она добавлена в `.gitignore`.

## Обновление Версии

Перед новой публикацией измените `version` в корневом `package.json`, например:

```json
"version": "1.0.1"
```

Затем выполните:

```powershell
npm run dist:win
git add .
git commit -m "Release v1.0.1"
git push
```

После этого создайте новый GitHub Release с тегом `v1.0.1` и прикрепите новый installer.
