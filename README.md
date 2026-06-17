# Hypnosia Launcher

Клиент лаунчера для проекта Hypnosia / Nachosia. Собран на Tauri 2 + React 19 + Vite 8.

## ⚠️ Безопасность и секреты

Этот репозиторий **публичный**. Никогда не коммитьте реальные URL, ключи, токены или сертификаты:

- Адрес сайта/API вынесен в `VITE_API_BASE_URL`.
- URL модов и зависимостей вынесены в переменные окружения Rust (`MOD_JAR_URL`, `FABRIC_API_URL`, `FABRIC_LANGUAGE_KOTLIN_URL`).
- Приватный ключ подписи обновлений (`*.key`) хранится локально и не попадает в репозиторий.

Перед коммитом проверьте, что в `.env`, `src-tauri/.env` и `secrets/` нет реальных значений.

## Требования

- [Rust](https://rustup.rs/) 1.77+
- [Node.js](https://nodejs.org/) 20+
- [cargo-tauri](https://v2.tauri.app/reference/cli/)

## Настройка окружения

```bash
# Frontend
cp .env.example .env
# Отредактируй .env, если запускаешь сайт локально

# Rust / Tauri
cp src-tauri/.env.example src-tauri/.env
# Отредактируй src-tauri/.env при необходимости
```

## Запуск в режиме разработки

```bash
npm install
cargo tauri dev
```

## Сборка production-инсталлятора

Убедись, что приватный ключ подписи доступен через переменные окружения:

```bash
export TAURI_SIGNING_PRIVATE_KEY=$(cat ~/.tauri/hypnosia-launcher.key)
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""   # если ключ без пароля
```

```bash
cargo tauri build
```

Артефакты появятся в `src-tauri/target/release/bundle/`. Если ключ корректен, рядом с `.exe`/`.msi` будут созданы файлы `.sig`.

## Автообновление

Лаунчер использует встроенный Tauri Updater. Обновления публикуются через GitHub Releases репозитория `Nachosia/hypnosia-launcher`.

### Как выпустить обновление

1. Подними версию в `package.json`, `src-tauri/Cargo.toml` и `src-tauri/tauri.conf.json`.
2. Запиши изменения в `CHANGELOG.md`.
3. Собери релиз с подписью:
   ```bash
   export TAURI_SIGNING_PRIVATE_KEY=$(cat ~/.tauri/hypnosia-launcher.key)
   export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""   # если ключ без пароля
   cargo tauri build
   ```
   Tauri автоматически создаст `.sig` файлы рядом с `.exe` и `.msi`.
4. Создай или обнови `latest.json`:
   - укажи новую версию, changelog и дату в формате RFC 3339;
   - в `platforms.windows-x86_64.url` укажи прямую ссылку на `.exe` из GitHub Release;
   - в `signature` вставь содержимое `.sig` файла (одной строкой).
5. Создай GitHub Release с тегом вида `v0.1.0` на `github.com/Nachosia/hypnosia-launcher`.
6. Прикрепи к Release:
   - `Hypnosia Launcher_0.1.0_x64-setup.exe`
   - `Hypnosia Launcher_0.1.0_x64-setup.exe.sig`
   - `Hypnosia Launcher_0.1.0_x64_en-US.msi`
   - `Hypnosia Launcher_0.1.0_x64_en-US.msi.sig`
   - `latest.json`
7. Убедись, что Release опубликован — Tauri Updater проверяет `https://github.com/Nachosia/hypnosia-launcher/releases/latest/download/latest.json`.

> ⚠️ **Приватный ключ** (`hypnosia-launcher.key`) нельзя терять и нельзя публиковать. Без него обновления перестанут работать.

## Структура проекта

```
.                           # Frontend (React + Vite)
├── src/
│   ├── lib/                # API и updater
│   ├── hooks/              # React-хуки
│   ├── pages/              # Страницы
│   └── types/              # TypeScript-типы
├── src-tauri/              # Rust + Tauri
│   ├── src/
│   │   ├── lib.rs          # Точка входа Tauri
│   │   └── minecraft.rs    # Запуск Minecraft
│   └── tauri.conf.json     # Конфигурация Tauri
└── .env.example            # Пример переменных frontend
```

## Лицензия

Укажите лицензию при публикации репозитория.
