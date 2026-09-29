/**
 * Diary journal head actions: Download (JSON / Excel) + Upload.
 */
import {
  DIARY_COMMENT_MAX_LEN,
  ensureDiaryJournalLoaded,
  replaceDiaryJournalFromImport,
  serializeDiaryJournalExcelXml,
  serializeDiaryJournalJson
} from "./trade-diary-journal.js?v=2";

function stamp() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function downloadBlob(filename, mime, text) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function closeMenu(wrap, btn, menu) {
  menu?.classList.add("hidden");
  btn?.setAttribute("aria-expanded", "false");
  wrap?.classList.remove("is-open");
}

/**
 * @param {{
 *   exchangeId: string,
 *   setStatus?: (text: string, opts?: object) => void,
 *   onJournalReplaced?: () => void | Promise<void>
 * }} opts
 */
export function mountDiaryJournalActions(opts) {
  const exchangeId = opts.exchangeId === "bingx" ? "bingx" : "bybit";
  const downloadBtn = document.getElementById("trade-diary-download-btn");
  const downloadMenu = document.getElementById("trade-diary-download-menu");
  const downloadWrap = document.getElementById("trade-diary-download-wrap");
  const uploadBtn = document.getElementById("trade-diary-upload-btn");
  const uploadInput = document.getElementById("trade-diary-upload-input");

  if (!downloadBtn || !uploadBtn) {
    return;
  }

  if (downloadWrap?.dataset.journalBound === "1") {
    return;
  }
  if (downloadWrap) {
    downloadWrap.dataset.journalBound = "1";
  }

  void ensureDiaryJournalLoaded(exchangeId);

  downloadBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const open = downloadMenu && !downloadMenu.classList.contains("hidden");
    if (open) {
      closeMenu(downloadWrap, downloadBtn, downloadMenu);
      return;
    }
    downloadMenu?.classList.remove("hidden");
    downloadBtn.setAttribute("aria-expanded", "true");
    downloadWrap?.classList.add("is-open");
  });

  downloadMenu?.addEventListener("click", (event) => {
    const item = event.target.closest("[data-download]");
    if (!item) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const kind = item.getAttribute("data-download");
    closeMenu(downloadWrap, downloadBtn, downloadMenu);

    void (async () => {
      await ensureDiaryJournalLoaded(exchangeId);
      if (kind === "excel") {
        downloadBlob(
          `multichart-diary-${exchangeId}-${stamp()}.xls`,
          "application/vnd.ms-excel;charset=utf-8",
          serializeDiaryJournalExcelXml(exchangeId)
        );
        opts.setStatus?.("Дневник скачан (Excel)");
        return;
      }
      downloadBlob(
        `multichart-diary-${exchangeId}-${stamp()}.json`,
        "application/json;charset=utf-8",
        serializeDiaryJournalJson(exchangeId)
      );
      opts.setStatus?.("Дневник скачан (JSON)");
    })();
  });

  document.addEventListener("click", (event) => {
    if (!downloadWrap?.classList.contains("is-open")) {
      return;
    }
    if (downloadWrap.contains(event.target)) {
      return;
    }
    closeMenu(downloadWrap, downloadBtn, downloadMenu);
  });

  uploadBtn.addEventListener("click", () => {
    uploadInput?.click();
  });

  uploadInput?.addEventListener("change", () => {
    const file = uploadInput.files?.[0];
    uploadInput.value = "";
    if (!file) {
      return;
    }
    void (async () => {
      let text = "";
      try {
        text = await file.text();
      } catch {
        opts.setStatus?.("Не удалось прочитать файл", { error: true });
        return;
      }
      const result = await replaceDiaryJournalFromImport(exchangeId, text);
      if (!result.ok) {
        opts.setStatus?.(result.message || "Файл дневника отклонён", {
          error: true
        });
        return;
      }
      opts.setStatus?.(
        `Дневник загружен: ${result.count} сделок (${exchangeId})`
      );
      await opts.onJournalReplaced?.();
    })();
  });
}

export { DIARY_COMMENT_MAX_LEN };
