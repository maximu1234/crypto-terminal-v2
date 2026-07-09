# Windows-only renderer patches

Импортировать только через `loadDesktopWinPatch()` из `js/desktop/platform.js`.

Пример:

```javascript
import { loadDesktopWinPatch } from "./desktop/platform.js?v=1";

void loadDesktopWinPatch(() =>
  import("./desktop/win/auth-paste.js?v=1").then((m) => m.mount())
);
```

Mac этот код не загружает.
