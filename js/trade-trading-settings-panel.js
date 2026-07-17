/**
 * Настройки торговли: объёмы по умолчанию, Auto SL/TP.
 */
import {
wireTradeVolumeDefaultsSettings,
TRADE_VOLUME_SLOT_COUNT
} from "./trade-volume-presets.js?v=10";

import {
wireAutoStopSettings
} from "./trade-auto-stops.js?v=16";

import {
loadTradeExchangeModules
} from "./trade/module-router.js?v=4";

import {
getActiveExchangeId
} from "./market-api.js?v=2";

const TRADE_VOLUME_DEFAULT_INPUT_COUNT =
Math.max(
1,
TRADE_VOLUME_SLOT_COUNT -
1
);

function buildDefaultVolumeFieldsHtml(){

return Array.from(
{
length:
TRADE_VOLUME_DEFAULT_INPUT_COUNT
},
(
_unused,
index
)=>
`
<label class="trade-volume-presets-row trade-volume-defaults-row" data-default-volume-slot="${index}">
<span class="trade-volume-defaults-label">${index + 1}</span>
<span class="trade-volume-presets-field">
<input type="number" min="0" step="any" inputmode="decimal" aria-label="Объём USDT ${index + 1}"/>
<span class="trade-volume-presets-suffix">$</span>
</span>
</label>
`
).join(
""
);

}

function buildTradingSettingsForm(
root
){

root.innerHTML =
`
<form class="trade-exchange-form trade-trading-settings-form" autocomplete="off">
<p class="header-settings-section-title">Объёмы по умолчанию (USDT)</p>
<p class="trade-exchange-hint">Для всех монет, пока не задан свой объём. «Сохранить» сбрасывает индивидуальные значения.</p>
<div class="trade-volume-defaults-panel trade-volume-presets-panel" data-role="volume-defaults-panel">
${buildDefaultVolumeFieldsHtml()}
</div>
<div class="trade-exchange-actions">
<button type="button" class="trade-exchange-save" data-role="save-volume-defaults">Сохранить</button>
</div>
<p class="trade-exchange-status-text" data-role="volume-defaults-status" aria-live="polite"></p>
<hr class="trade-exchange-divider"/>
<p class="header-settings-section-title">Auto SL/TP (USDT)</p>
<p class="trade-exchange-hint">После рыночного входа — авто SL/TP в USDT от позиции.</p>
<div class="trade-auto-stops-panel" data-role="auto-stops-panel">
<label class="trade-auto-stops-row">
<input type="checkbox" data-role="auto-sl-enabled"/>
<span class="trade-auto-stops-label">Stop Loss</span>
<span class="trade-volume-presets-field">
<input type="number" min="0" step="any" inputmode="decimal" data-role="auto-sl-usd" aria-label="Stop Loss USDT"/>
<span class="trade-volume-presets-suffix">$</span>
</span>
</label>
<label class="trade-auto-stops-row">
<input type="checkbox" data-role="auto-tp-enabled"/>
<span class="trade-auto-stops-label">Take Profit</span>
<span class="trade-volume-presets-field">
<input type="number" min="0" step="any" inputmode="decimal" data-role="auto-tp-usd" aria-label="Take Profit USDT"/>
<span class="trade-volume-presets-suffix">$</span>
</span>
</label>
</div>
<div class="trade-exchange-actions">
<button type="button" class="trade-exchange-save" data-role="save-auto-stops">Сохранить</button>
</div>
<p class="trade-exchange-status-text" data-role="auto-stops-status" aria-live="polite"></p>
</form>
`;

return root.querySelector(
".trade-trading-settings-form"
);

}

export async function mountTradingSettingsPanel(
host
){

if(
!host ||
host.dataset.tradingMounted ===
"1"
){
return;
}

host.dataset.tradingMounted =
"1";

await loadTradeExchangeModules(
getActiveExchangeId()
);

const form =
buildTradingSettingsForm(
host
);

wireTradeVolumeDefaultsSettings(
form
);
wireAutoStopSettings(
form
);

}
