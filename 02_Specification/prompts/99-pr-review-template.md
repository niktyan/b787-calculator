# Template: PR Review через Expo Go

> **Когда использовать:** каждый раз, когда у вас есть открытый PR, ожидающий вашего функционального review через Expo Go.
>
> **Это не промпт для Claude Code** — это пошаговая инструкция для вас, разработчика. Если что-то не работает, последний шаг — попросить Claude Code исправить.

---

## Шаг 1 · Убедитесь, что CI зелёный

1. Откройте PR в браузере.
2. Прокрутите вниз до раздела «Checks» / «Actions».
3. Все проверки должны быть зелёными (✓):
   - `quality` — lint + typecheck + tests + coverage.
   - `build-preview` — EAS preview-build.
4. Если хотя бы одна красная — НЕ переходите к шагу 2. Скопируйте текст ошибки и попросите Claude Code исправить (см. шаг 5).

---

## Шаг 2 · Установите preview-build на iPhone

В output `build-preview` job на GitHub Actions есть ссылка на EAS-build (или его статус-страницу). Альтернативно зайдите на https://expo.dev и найдите последний build по ветке PR.

**Способ A · через TestFlight (если настроен):**
1. Откройте TestFlight на iPhone.
2. Найдите B787 Calculator → выберите последнюю сборку из ветки PR.
3. Tap «Install».

**Способ B · через Expo Go (для development-сборок):**
1. Откройте Expo Go на iPhone.
2. Авторизуйтесь под вашим Expo account (тем же, в котором запускались билды).
3. На главном экране вкладка «Recent Projects» покажет недавние preview-сборки.
4. Tap нужную сборку.

**Способ C · напрямую по ссылке:**
1. Откройте https://expo.dev/accounts/<your-account>/projects/b787-calculator/builds на iPhone.
2. Найдите нужную сборку.
3. Tap «Open with Expo Go» (или используйте QR-код).

---

## Шаг 3 · Прочитайте «Manual testing instructions» в описании PR

Каждый PR содержит секцию «Manual testing instructions» — пошаговый список того, что нужно проверить. Откройте описание PR на GitHub и читайте параллельно с тестированием.

---

## Шаг 4 · Пройдите по списку проверок

Для каждого пункта manual testing:
1. Выполните действие на iPhone.
2. Сравните результат с ожидаемым в описании.
3. Если **совпадает** — ✓.
4. Если **не совпадает** — отметьте в уме (или в заметках) что именно не работает.

Дополнительно, всегда (независимо от specific manual testing):
- Проверьте обе темы (Light + Dark) — они должны выглядеть одинаково корректно.
- Проверьте оба языка (RU + EN), если sprint затрагивает UI текст.
- Проверьте Portrait и Landscape ориентации, если sprint затрагивает layout.

---

## Шаг 5 · Принимаете решение

### Сценарий A · Всё работает

1. Возвращайтесь в окно Claude Code, где идёт сессия по этому спринту.
2. Напишите в чат одно из:
   ```
   merge it
   ```
   или просто `merge`, или `всё ок, мердж`. Любая короткая фраза, выражающая согласие.
3. Claude Code выполнит `gh pr merge <PR-number> --squash --delete-branch` и подтвердит вам в чате что branch удалён.
4. Переходите к следующему промпту реализации.

Если хочется бегло посмотреть diff в браузере перед написанием «merge it» — это опционально, но не обязательно. Спецификация и quality gates защищают от низкого качества кода.

### Сценарий B · Что-то не работает

1. На странице PR в браузере → tab «Conversation» → внизу окно комментария.
2. Опишите конкретно, что не работает:
   ```
   Manual testing failed at step N: expected X, got Y.
   Screenshot: [optional, drag-and-drop]
   ```
3. **Submit comment**.
4. Откройте Claude Code в терминале (если ещё не открыт):
   ```bash
   claude
   ```
5. Скопируйте этот промпт:
   ```
   The PR <branch-name> has functional issues found during manual testing on iPhone:
   
   <paste your comment from the PR>
   
   Please diagnose the issue, fix it, and push to the same branch. Do NOT
   create a new PR. After fixing, briefly explain what was wrong.
   
   The PR will re-trigger CI on push, and I'll re-test once green.
   ```
6. Дождитесь работы Claude Code, новых коммитов в PR, нового зелёного CI.
7. Снова пройдите manual testing.
8. Если проблема устранена → Сценарий A. Если нет → повторите.

### Сценарий C · CI красный

1. На странице PR → tab «Files changed» → вверху панель с failed check.
2. Click «Details» рядом с failed check.
3. Прокрутите до сообщения об ошибке.
4. Скопируйте релевантную часть лога.
5. Откройте Claude Code:
   ```bash
   claude
   ```
6. Скопируйте этот промпт:
   ```
   The PR <branch-name> has a failing CI check. Here's the error log:
   
   <paste error log>
   
   Please diagnose, fix, and push to the same branch. Brief explanation
   of what was wrong.
   ```
7. Дождитесь зелёного CI.
8. Переходите к Шагу 2 (тестирование).

---

## Полезные команды для bash (если нужно)

**Посмотреть текущий статус PR:**
```bash
gh pr status
```

**Прочитать комментарии и checks в текущем PR:**
```bash
gh pr view --json title,checks,reviews
```

**Посмотреть последние коммиты в PR:**
```bash
gh pr view --json commits
```

**Логи последнего failed CI run:**
```bash
gh run list --workflow=ci.yml --limit 5
gh run view <run-id> --log-failed
```
