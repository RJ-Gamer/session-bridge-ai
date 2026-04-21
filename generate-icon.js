const sharp = require("sharp");
const fs = require("fs");

const svg = `<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="24" fill="#1a1a2e"/>
  <rect x="14" y="56" width="26" height="26" rx="6" fill="#4f8ef7"/>
  <rect x="88" y="56" width="26" height="26" rx="6" fill="#4f8ef7"/>
  <rect x="44" y="34" width="40" height="52" rx="4" fill="#ffffff"/>
  <rect x="50" y="42" width="28" height="4" rx="2" fill="#4f8ef7"/>
  <rect x="50" y="50" width="22" height="3" rx="1.5" fill="#c0cfe8"/>
  <rect x="50" y="57" width="25" height="3" rx="1.5" fill="#c0cfe8"/>
  <rect x="50" y="64" width="18" height="3" rx="1.5" fill="#c0cfe8"/>
  <rect x="50" y="71" width="22" height="3" rx="1.5" fill="#c0cfe8"/>
  <line x1="44" y1="69" x2="27" y2="69" stroke="#4f8ef7" stroke-width="2" stroke-linecap="round"/>
  <polygon points="22,65 14,69 22,73" fill="#4f8ef7"/>
  <line x1="84" y1="69" x2="101" y2="69" stroke="#4f8ef7" stroke-width="2" stroke-linecap="round"/>
  <polygon points="106,65 114,69 106,73" fill="#4f8ef7"/>
  <path d="M27 90 Q64 104 101 90" fill="none" stroke="#a0b4d0" stroke-width="1.5" stroke-dasharray="3,2"/>
  <circle cx="27" cy="90" r="3" fill="#a0b4d0"/>
  <circle cx="101" cy="90" r="3" fill="#a0b4d0"/>
</svg>`;

fs.writeFileSync("icon.svg", svg);

sharp(Buffer.from(svg))
  .resize(128, 128)
  .png()
  .toFile("icon.png", (err, info) => {
    if (err) console.error(err);
    else console.log("icon.png created:", info);
  });
