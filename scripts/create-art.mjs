import { writeFile, mkdir } from "node:fs/promises";
await mkdir("public/art", { recursive: true });
const palettes = {
  Nap: {
    sky: "#e5ddf1",
    haze: "#d3c6e1",
    far: "#a7b59f",
    hill: "#859b84",
    ground: "#70876c",
    tree: "#637761",
    leaf: "#819078",
    river: "#c1cdd8",
    cap: "#ce836c",
  },
  Jog: {
    sky: "#e9e9cb",
    haze: "#d6dfb8",
    far: "#bac7a4",
    hill: "#91ad80",
    ground: "#7f9b70",
    tree: "#67835f",
    leaf: "#a8bc8d",
    river: "#b1d6d1",
    cap: "#d18362",
  },
  Zoomies: {
    sky: "#d4e1e5",
    haze: "#c1d5d8",
    far: "#9db9ad",
    hill: "#85a295",
    ground: "#6a8d79",
    tree: "#577969",
    leaf: "#8fae98",
    river: "#c6dedb",
    cap: "#d48665",
  },
};
const stars = [
  [328, 48, 3],
  [579, 54, 4],
  [698, 83, 2],
  [449, 109, 2],
  [802, 40, 3],
  [218, 67, 2],
  [626, 135, 3],
  [389, 157, 2],
  [158, 112, 3],
];
const fern = (x, y, s, flip = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s * flip} ${s})" fill="#d4dab3"><path d="M0 0Q-5-45 1-80Q12-40 0 0"/><path d="M0-5Q-40-15-35-38Q-8-36 0-5M0-21Q-36-35-29-56Q-5-51 0-21M0-40Q-27-56-19-71Q-1-63 0-40M0-8Q31-28 38-18Q29-3 0-8M0-32Q26-52 32-41Q24-25 0-32M0-51Q22-68 24-57Q15-44 0-51"/></g>`;
const mushroom = (x, y, s, cap) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-12-4Q-6 20-13 40Q0 48 16 39Q9 13 13-4" fill="#f1ddbd"/><path d="M-47 1C-53-15-26-55-2-54C24-55 54-12 49 1Q1 17-47 1" fill="${cap}"/><g fill="#f7e8cc"><ellipse cx="-20" cy="-17" rx="9" ry="5" transform="rotate(-26 -20 -17)"/><ellipse cx="12" cy="-35" rx="8" ry="6"/><ellipse cx="30" cy="-10" rx="5" ry="4"/></g><path d="M-41 1Q0 13 45 1" stroke="#a66d56" stroke-width="2" fill="none" opacity=".5"/></g>`;
const hamster = (
  sleep = false,
  zoom = false,
) => `<g transform="translate(${zoom ? 550 : 514} 271) rotate(${zoom ? -12 : 0})">
  <ellipse cx="0" cy="68" rx="89" ry="14" fill="#3f5446" opacity=".16"/>
  <ellipse cx="-44" cy="52" rx="22" ry="13" fill="#d6a477" transform="rotate(-12 -44 52)"/><ellipse cx="51" cy="51" rx="22" ry="14" fill="#d6a477"/>
  <ellipse cx="7" cy="7" rx="78" ry="66" fill="#c39466"/>
  <path d="M-62-16Q-72-79-41-79Q-11-78-16-43M30-43Q35-88 64-72Q87-57 67-16" fill="#c39466"/>
  <ellipse cx="-44" cy="-54" rx="15" ry="19" fill="#dcad96" transform="rotate(-16 -44 -54)"/><ellipse cx="51" cy="-53" rx="14" ry="17" fill="#dcad96" transform="rotate(18 51 -53)"/>
  <ellipse cx="0" cy="14" rx="72" ry="57" fill="#dfb681"/>
  <path d="M-57 8Q-31-20 0-11Q34-24 65 8Q69 61 1 68Q-62 66-57 8" fill="#f6e2ba"/>
  ${sleep ? '<path d="M-39 4q10 11 20 0M20 4q10 11 20 0" stroke="#4f443b" stroke-width="4" stroke-linecap="round" fill="none"/>' : '<ellipse cx="-27" cy="2" rx="5.7" ry="7.5" fill="#433d34"/><ellipse cx="31" cy="2" rx="5.7" ry="7.5" fill="#433d34"/><circle cx="-29" cy="0" r="1.6" fill="#fff5de"/><circle cx="29" cy="0" r="1.6" fill="#fff5de"/>'}
  <ellipse cx="-47" cy="23" rx="13" ry="8" fill="#dc9c8c" opacity=".7"/><ellipse cx="50" cy="23" rx="13" ry="8" fill="#dc9c8c" opacity=".7"/>
  <path d="M-5 15Q2 10 9 15Q3 24-5 15" fill="#9b6a5c"/><path d="M3 21v6m-8-1q8 8 16 0" stroke="#795845" stroke-width="2.4" stroke-linecap="round" fill="none"/>
  <path d="M-74 43Q0 68 76 39L69 61Q3 89-66 60Z" fill="#98646c"/><path d="M59 52L106 48L96 68L61 68" fill="#98646c"/>
  <ellipse cx="-51" cy="42" rx="18" ry="12" fill="#e5bd8d" transform="rotate(20 -51 42)"/><ellipse cx="44" cy="48" rx="18" ry="12" fill="#e5bd8d" transform="rotate(-22 44 48)"/>
  ${sleep ? '<path d="M-43 40L-1 48L35 36L40 65L0 76L-40 67Z" fill="#81977c"/><path d="M-1 48L0 76M-36 43L-5 51M5 51L31 41" fill="none" stroke="#c8d0ae" stroke-width="2"/>' : '<path d="M-2 44L8 45L13 70L-8 70Z" fill="#e1bb6b"/><path d="M-13 51L18 51L17 74L-10 74Z" fill="#f5d38b" stroke="#a78353" stroke-width="2"/><path d="M-9 51Q-9 35 6 38Q18 41 15 51" fill="none" stroke="#a78353" stroke-width="3"/><path d="M2 56Q-5 65 3 69Q11 66 2 56" fill="#fff0bb"/>'}
</g>`;
for (const [name, p] of Object.entries(palettes)) {
  const nap = name === "Nap",
    zoom = name === "Zoomies";
  const art = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 430" fill="none">
<defs><filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".065"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter><radialGradient id="glow"><stop stop-color="#fff6c8" stop-opacity=".75"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient></defs>
<g filter="url(#paper)"><path fill="${p.sky}" d="M0 0h1000v430H0z"/>
<circle cx="755" cy="91" r="49" fill="#f9edc5"/>${nap ? `<circle cx="778" cy="72" r="43" fill="${p.sky}"/>` : ""}
<path d="M0 190Q99 101 206 168T431 145T650 150T1000 155V430H0" fill="${p.haze}"/>
<path d="M0 225Q113 170 239 213T480 201T749 194T1000 214V430H0" fill="${p.far}"/>
${stars.map(([x, y, r]) => `<path d="M${x} ${y - r * 3}q0 ${r * 3} ${r * 3} ${r * 3}q-${r * 3} 0-${r * 3} ${r * 3}q0-${r * 3}-${r * 3}-${r * 3}q${r * 3} 0 ${r * 3}-${r * 3}" fill="#fff4ce" opacity="${nap || zoom ? 0.9 : 0.65}"/>`).join("")}
${zoom ? '<path d="M496 48L632 92L599 81" stroke="#fff5cb" stroke-width="4" stroke-linecap="round"/><path d="M620 73l4 12 12 5-12 3-4 12-4-12-12-3 12-5z" fill="#fff4bf"/>' : ""}
<path d="M0 303Q143 227 284 273Q437 303 538 274Q712 225 1000 264V430H0" fill="${p.hill}"/>
<path d="M707 244Q628 276 741 306T764 430H1000V392Q936 348 815 320Q707 294 752 252Z" fill="${p.river}"/>
<path d="M753 260l37 4m-38 31l40 4m-18 61l101 5m-90 30l66 5m-66 23l100 2" stroke="#eef0d9" stroke-width="2" opacity=".65"/>
<path d="M0 365Q173 286 360 340T666 330Q747 319 779 338L745 430H0" fill="${p.ground}"/>
<path d="M304 430Q389 365 524 352Q585 345 652 351" stroke="#d4c79f" stroke-width="46" stroke-linecap="round"/>
<path d="M300 430Q389 365 524 352Q585 345 652 351" stroke="#ded0ad" stroke-width="35" stroke-linecap="round"/>
<g fill="${p.tree}"><path d="M50 0Q80 117 58 329l43 1Q80 137 113 0"/><path d="M88 103Q147 58 196 50Q144 78 96 128M77 157Q24 108 0 102V75q41 24 77 56"/><path d="M899 0Q937 111 915 293l37 8Q933 110 970 0"/><path d="M934 124Q884 66 838 59q56 1 105 40"/></g>
<g fill="${p.leaf}"><ellipse cx="56" cy="11" rx="114" ry="66"/><ellipse cx="147" cy="15" rx="104" ry="47"/><ellipse cx="19" cy="75" rx="73" ry="69"/><ellipse cx="211" cy="11" rx="50" ry="29"/><ellipse cx="922" cy="17" rx="125" ry="65"/><ellipse cx="1000" cy="86" rx="80" ry="66"/></g>
<g opacity=".45" stroke="#d3d8b4" stroke-width="2"><path d="M44 19q22 28 13 63M124 12q9 14 29 18M910 16q20 23 28 40M984 70q-14 22-8 40"/></g>
<path d="M183 248L193 188L279 188L291 259Q240 280 183 248" fill="#ecd8b9"/><path d="M158 193Q157 146 225 120Q285 126 316 189Q244 214 158 193Z" fill="${p.cap}"/>
<g fill="#f4dec3"><ellipse cx="201" cy="161" rx="12" ry="8" transform="rotate(-22 201 161)"/><ellipse cx="247" cy="142" rx="13" ry="8"/><ellipse cx="282" cy="179" rx="10" ry="6"/></g>
<path d="M214 258v-29a21 21 0 0 1 42 0v32" fill="#8a7962"/><path d="M220 258v-27a15 15 0 0 1 30 0v30" fill="#b09270"/><circle cx="243" cy="242" r="2" fill="#f3dca8"/>
<circle cx="279" cy="223" r="11" fill="#f5d995" stroke="#a89777" stroke-width="4"/><path d="M268 223h22m-11-11v22" stroke="#a89777" stroke-width="2"/>
<path d="M167 282l19-8 27 4-17 10zM184 299l23-9 31 4-22 12z" fill="#d0c8a6"/>
${mushroom(113, 330, 0.65, p.cap)}${mushroom(324, 303, 0.4, p.cap)}${mushroom(862, 348, 0.8, p.cap)}${mushroom(907, 367, 0.5, p.cap)}
${fern(45, 397, 1.2)}${fern(111, 430, 0.85, -1)}${fern(935, 429, 1.5)}${fern(370, 331, 0.45)}${fern(808, 337, 0.55, -1)}
<path d="M760 322q-9-35 64-20l77 31" stroke="#988868" stroke-width="9"/><path d="M761 323l124 24m-106-34l-3 35m30-33l-4 37m31-28l-5 37m29-27l-4 32m31-20l-8 25" stroke="#b8a584" stroke-width="7"/>
${hamster(nap, zoom)}
${nap ? '<path d="M598 202h16l-14 17h17M619 176h23l-21 24h24" stroke="#7d7192" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' : ""}
${zoom ? '<path d="M384 265l35 0m-51 19l42 0m-25 18l32 0" stroke="#f2e6c1" stroke-width="4" stroke-linecap="round"/>' : ""}
<g fill="#f8e7ab">${[
    [384, 207],
    [640, 262],
    [675, 180],
    [336, 276],
    [838, 245],
  ]
    .map(
      ([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="2.5"/><circle cx="${x}" cy="${y}" r="18" fill="url(#glow)"/>`,
    )
    .join("")}</g>
<g fill="#ddd7b5"><ellipse cx="147" cy="378" rx="5" ry="2" transform="rotate(-27 147 378)"/><ellipse cx="250" cy="338" rx="5" ry="2"/><ellipse cx="673" cy="393" rx="6" ry="3" transform="rotate(40 673 393)"/><ellipse cx="588" cy="417" rx="5" ry="2"/></g>
<g stroke="#d9c89f" stroke-width="2.5" stroke-linecap="round"><path d="M186 374v14m-5-10l10 6M704 307v13m-5-11l9 6M857 401v12m-5-9l9 6"/></g>
<g fill="#efd6ad"><circle cx="184" cy="371" r="4"/><circle cx="704" cy="304" r="4"/><circle cx="856" cy="398" r="4"/></g>
</g></svg>`;
  await writeFile(`public/art/${name.toLowerCase()}.svg`, art);
}
await writeFile(
  "public/art/favicon.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="20" fill="#f1dbc0"/><circle cx="17" cy="19" r="11" fill="#c39466"/><circle cx="47" cy="19" r="11" fill="#c39466"/><circle cx="17" cy="19" r="6" fill="#dcad96"/><circle cx="47" cy="19" r="6" fill="#dcad96"/><ellipse cx="32" cy="36" rx="26" ry="23" fill="#dfb681"/><ellipse cx="32" cy="42" rx="22" ry="16" fill="#f9e9ca"/><circle cx="22" cy="32" r="3" fill="#433d34"/><circle cx="42" cy="32" r="3" fill="#433d34"/><path d="M28 40q4-4 8 0l-4 4Z" fill="#9b6a5c"/><path d="M27 47q5 4 10 0" stroke="#795845" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
);
console.log("Created three original story illustrations and favicon.");
