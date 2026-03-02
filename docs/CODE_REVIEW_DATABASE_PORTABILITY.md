# Code review: Database portability (MySQL / MariaDB / PostgreSQL)

This document reviews the DB-dialect portability work and confirms maximum support for MySQL/MariaDB and PostgreSQL while preserving core module behaviour.

---

## 1. Scope of support

| Engine | Support | Notes |
|--------|---------|--------|
| **MySQL 5.7+** | Yes | JSON columns, `JSON_EXTRACT` / `JSON_UNQUOTE`; all app queries use Laravel abstractions or portable raw SQL. |
| **MariaDB 10.2+** | Yes | Same as MySQL; Laravel uses `mysql` driver. Production (Agila) runs MariaDB. |
| **PostgreSQL** | Yes | Local Sail uses Postgres; JSON path and `ILIKE` replaced with portable patterns where needed. |
| **SQLite** | Compatible | Not used in prod; `DatabaseDialect` uses `LOWER()`/`LIKE` and standard SQL, so it would work for testing. |

---

## 2. Changes made (no regressions)

### 2.1 Chatbot logs – JSON select

- **Before:** `selectRaw("distinct state->>'current_state' as value")` (Postgres-only `->>`).
- **After:** `->select('state->current_state as value')->distinct()`.
- **Behaviour:** Laravel compiles this per driver (Postgres: `->>'current_state'`, MySQL/MariaDB: `JSON_UNQUOTE(JSON_EXTRACT(...))`). Same result set; core behaviour unchanged.

### 2.2 Orders and action logs – case-insensitive search

- **Before:** `where(..., 'ilike', ...)` (Postgres-only `ILIKE`).
- **After:** `DatabaseDialect::addCaseInsensitiveLike` / `addCaseInsensitiveLikeOr` using `LOWER(column) LIKE ?`.
- **Behaviour:** Still case-insensitive; works on MySQL/MariaDB and Postgres. No change to what users see.

### 2.3 New helper – `App\Support\DatabaseDialect`

- **Role:** Single place for dialect-sensitive patterns (case-insensitive LIKE).
- **Safety:** Column names are always from application code, not user input; values are bound with `?`. No SQL injection from this helper when used as in OrdersController and ActionLog.

---

## 3. Core modules – functionality preserved

| Module | JSON / search usage | Portable? | Notes |
|--------|----------------------|-----------|--------|
| **ChatbotSession** | `state->current_state`, `state->automation_disabled`, `state->customer_name`; `whereIn('state->current_state', ...)`; `selectRaw('1')` for EXISTS | Yes | All via Laravel JSON path or standard SQL. |
| **ChatbotLogsController** | `select('state->current_state as value')`; `filterForLogs` uses `like` and `state->customer_name` | Yes | JSON select fixed; filters unchanged and portable. |
| **ConversationInboxController** | `saved_customer_name` / `state->customer_name` with `like` | Yes | Uses `like`, not `ilike`; no change. |
| **OrdersController** | Completed-orders search via `DatabaseDialect::addCaseInsensitiveLikeOr` | Yes | Replaces `ilike`; behaviour unchanged. |
| **ActionLog** | `scopeFilterForLogs` customer/reference search via `DatabaseDialect` | Yes | Replaces `ilike`; behaviour unchanged. |
| **DashboardController** | `selectRaw` with `COUNT`, `SUM`, `CASE WHEN` | Yes | Standard SQL. |
| **MenuItemStockService** | `selectRaw` with `COALESCE`, `SUM` | Yes | Standard SQL. |
| **ChatbotOrderLookupService** | `whereRaw('UPPER(reference) = ?', ...)` | Yes | Standard SQL. |
| **Console (takeover expiry)** | `where('state->current_state', 'human_takeover')` | Yes | Laravel JSON path. |

No core module was broken; only dialect-specific syntax was replaced with portable equivalents.

---

## 4. Remaining raw SQL (all portable)

- **DashboardController:** `COUNT(*)`, `SUM(CASE WHEN ...)`, `SUM(quantity)`, `ORDER BY SUM(quantity)` – standard.
- **UsersController:** `orderByRaw('name IS NULL, name ASC')` – standard.
- **ChatbotSession:** `selectRaw('1')` in EXISTS subqueries – standard.
- **MenuItemStockService:** `COALESCE(SUM(quantity), 0)` – standard.
- **ChatbotOrderLookupService:** `UPPER(reference) = ?` – standard.

None of these use Postgres-only or MySQL-only syntax.

---

## 5. Recommendations

1. **Keep using Laravel JSON path in queries**  
   Use `'state->current_state'` (and similar) in `where`/`select` so the framework can compile per driver. Avoid raw `->>` or `JSON_EXTRACT` in application code.

2. **Use `DatabaseDialect` for case-insensitive search**  
   For any new search that should be case-insensitive, use `DatabaseDialect::addCaseInsensitiveLike` or `addCaseInsensitiveLikeOr` instead of `ilike` or raw `ILIKE`.

3. **Tests**  
   Run the test suite on the default (Postgres) DB; optionally run again with a MySQL/MariaDB test DB (e.g. separate `.env.testing`) before deploying to production.

4. **Docs**  
   `docs/HOSTING_AGILA_SETUP.md` §9 documents DB portability and the rules above.

---

## 6. Conclusion

- **Maximum support:** The app is written to run on **MySQL, MariaDB, and PostgreSQL** without dialect-specific code paths beyond Laravel’s own grammar and the shared `DatabaseDialect` helper.
- **Core functionality:** All listed core modules behave as before; only non-portable syntax was replaced with portable equivalents.
