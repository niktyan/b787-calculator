# src/core/logger

Логгер. **No-op в production-сборке** (соответствие правилу AGENTS.md Rule 8). В development можно писать `logger.warn()`/`logger.error()`. `console.log` запрещён ESLint правилом `no-console`.
