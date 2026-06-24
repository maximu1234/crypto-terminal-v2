/** @module qwerty-key-input — латиница по физической клавише при любой раскладке. */

const SHIFT_DIGITS =
[
")",
"!",
"@",
"#",
"$",
"%",
"^",
"&",
"*",
"("
];

const KEY_CODE_CHAR =
{};

for(
let i =
0;
i <=
9;
i++
){

const digit =
String(
i
);

KEY_CODE_CHAR[
`Digit${i}`
] =
[
digit,
SHIFT_DIGITS[
i
]
];
KEY_CODE_CHAR[
`Numpad${i}`
] =
[
digit,
digit
];

}

const PUNCT =
[
["Backquote", "`", "~"],
["Minus", "-", "_"],
["Equal", "=", "+"],
["BracketLeft", "[", "{"],
["BracketRight", "]", "}"],
["Backslash", "\\", "|"],
["Semicolon", ";", ":"],
["Quote", "'", '"'],
["Comma", ",", "<"],
["Period", ".", ">"],
["Slash", "/", "?"]
];

for(
const [
code,
lo,
hi
] of
PUNCT
){

KEY_CODE_CHAR[
code
] =
[
lo,
hi
];

}

for(
let i =
0;
i <
26;
i++
){

const lo =
String.fromCharCode(
97 +
i
);
const hi =
lo.toUpperCase();

KEY_CODE_CHAR[
`Key${hi}`
] =
[
lo,
hi
];

}

const RU_LOWER =
"йцукенгшщзхъфывапролджэячсмитьбюё";
const EN_LOWER =
"qwertyuiop[]asdfghjkl;'zxcvbnm,.`";

export function transliterateRuKeyboardLayout(
text
){

let out =
"";

for(
const ch of
text
){

const low =
ch.toLowerCase();
const idx =
RU_LOWER.indexOf(
low
);

if(
idx >=
0
){

const en =
EN_LOWER[
idx
];
out +=
ch ===
low
? en
: en.toUpperCase();
continue;
}

out +=
ch;

}

return out;

}

function charFromKeyEvent(
e
){

const pair =
KEY_CODE_CHAR[
e.code
];

if(
!pair
){
return null;
}

if(
e.code.startsWith(
"Key"
)
){

const caps =
e.getModifierState(
"CapsLock"
);
const upper =
e.shiftKey !==
caps;
return upper
? pair[
1
]
: pair[
0
];

}

return e.shiftKey
? pair[
1
]
: pair[
0
];

}

function insertAtCursor(
input,
text
){

const start =
input.selectionStart ??
input.value.length;
const end =
input.selectionEnd ??
start;

input.value =
input.value.slice(
0,
start
) +
text +
input.value.slice(
end
);

const pos =
start +
text.length;

input.setSelectionRange(
pos,
pos
);

}

/**
 * @param {HTMLInputElement | null | undefined} input
 * @param {{ onInput?: () => void }} [opts]
 * @returns {() => void} teardown
 */
export function mountQwertyKeyInput(
input,
opts =
{}
){

if(
!input
){
return ()=>{};
}

const notify =
()=>{
opts.onInput?.();
};

const onKeyDown =
e=>{

if(
e.isComposing ||
e.ctrlKey ||
e.metaKey ||
e.altKey
){
return;
}

if(
e.key ===
"Backspace" ||
e.key ===
"Delete" ||
e.key ===
"ArrowLeft" ||
e.key ===
"ArrowRight" ||
e.key ===
"ArrowUp" ||
e.key ===
"ArrowDown" ||
e.key ===
"Home" ||
e.key ===
"End" ||
e.key ===
"Tab" ||
e.key ===
"Enter" ||
e.key ===
"Escape"
){
return;
}

const ch =
charFromKeyEvent(
e
);

if(
ch ===
null
){
return;
}

e.preventDefault();
insertAtCursor(
input,
ch
);
input.dispatchEvent(
new Event(
"input",
{
bubbles:
true
}
)
);

};

const onPaste =
e=>{

e.preventDefault();

const raw =
e.clipboardData?.getData(
"text/plain"
) ??
"";
const text =
transliterateRuKeyboardLayout(
raw
);

insertAtCursor(
input,
text
);
input.dispatchEvent(
new Event(
"input",
{
bubbles:
true
}
)
);

};

const onInput =
()=>{

const converted =
transliterateRuKeyboardLayout(
input.value
);

if(
converted !==
input.value
){

const pos =
input.selectionStart ??
converted.length;

input.value =
converted;
input.setSelectionRange(
pos,
pos
);

}

notify();

};

input.addEventListener(
"keydown",
onKeyDown
);
input.addEventListener(
"paste",
onPaste
);
input.addEventListener(
"input",
onInput
);

return ()=>{
input.removeEventListener(
"keydown",
onKeyDown
);
input.removeEventListener(
"paste",
onPaste
);
input.removeEventListener(
"input",
onInput
);
};

}
