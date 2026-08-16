const LETTERS = ["H", "E", "Y", "I"];
const DIRECTIONS = ["NORTH", "EAST", "SOUTH", "WEST"];
const DIRECTION_ZH = ["北", "东", "南", "西"];
const SIGNATURES = [0xb1, 0xb2, 0xb4, 0xb8];
const OUTPUT_BYTES = [[0x48, 0xb1], [0x45, 0xb2], [0x59, 0xb4], [0x49, 0xb8]];
const config = window.HE_YI_CONFIG;

const I18N = {
  en: {
    blockSignal: "BLOCK SIGNAL", permanentSignal: "A PERMANENT SIGNAL FOR",
    dedication: "Four letters, one circuit.<br />Clocked forever by BNB Chain.",
    liveOutput: "LIVE CIRCUIT OUTPUT", bitsName: "Bits become a name.",
    pause: "PAUSE", play: "PLAY", stepSignal: "STEP SIGNAL",
    asciiPayload: "ASCII PAYLOAD", activeLetterLabel: "ACTIVE LETTER",
    oneHot: "B + ONE-HOT DIRECTION", decodeRaw: "DECODE RAW OUTPUT", decode: "DECODE",
    rawHelp: "16 bits: ASCII letter in byte 0; Binance signature B1/B2/B4/B8 in byte 1.",
    targetProcessor: "TARGET PROCESSOR", footerLine: "TO HE YI <b>◆</b> FOREVER ON BNB CHAIN",
    valid: (letter, direction, hex) => `VALID — ${hex} = ${letter} / BINANCE ${direction}.`,
    invalidLength: "Enter exactly 16 output bits.",
    invalidSignature: "Byte 1 is not a valid Binance B1/B2/B4/B8 signature.",
    invalidLetter: "ASCII byte does not match the active HEYI frame.",
    chainLive: "CHAIN", demo: "DEMO", chainError: "CHAIN RETRY",
  },
  zh: {
    blockSignal: "区块信号", permanentSignal: "一束永久的链上信号，献给",
    dedication: "四个字母，一枚电路。<br />由 BNB Chain 永久驱动。",
    liveOutput: "实时电路输出", bitsName: "比特，成为她的名字。",
    pause: "暂停", play: "播放", stepSignal: "下一帧",
    asciiPayload: "ASCII 字符", activeLetterLabel: "当前字母",
    oneHot: "B + 单热方向信号", decodeRaw: "解码原始输出", decode: "解码",
    rawHelp: "共 16 位：第 0 字节是 ASCII 字母；第 1 字节是 Binance 签名 B1/B2/B4/B8。",
    targetProcessor: "目标处理器", footerLine: "献给何一 <b>◆</b> 永存于 BNB CHAIN",
    valid: (letter, direction, hex) => `有效 — ${hex} = ${letter} / BINANCE ${direction}。`,
    invalidLength: "请输入恰好 16 位输出。",
    invalidSignature: "第 1 字节不是有效的 Binance B1/B2/B4/B8 签名。",
    invalidLetter: "ASCII 字节与当前 HEYI 帧不匹配。",
    chainLive: "链上", demo: "演示", chainError: "链上重试",
  },
};

const state = {
  frame: 0, tick: 0, autoplay: true, timer: null,
  locale: localStorage.getItem("heyi-locale") || "zh",
  source: "demo", circuitState: config.initialState, provider: null, contract: null,
};

const ui = {
  letters: [...document.querySelectorAll("[data-letter]")],
  diamonds: [...document.querySelectorAll("[data-direction]")],
  center: document.querySelector(".diamond.center"), tick: document.querySelector("#tickLabel"),
  caption: document.querySelector("#frameCaption"), activeLetter: document.querySelector("#activeLetter"),
  direction: document.querySelector("#directionText"), oneHot: document.querySelector("#oneHotBits"),
  asciiHex: document.querySelector("#asciiHex"), asciiText: document.querySelector("#asciiText"),
  rawBits: document.querySelector("#rawBits"), status: document.querySelector("#decodeStatus"),
  step: document.querySelector("#stepButton"), auto: document.querySelector("#autoButton"),
  decode: document.querySelector("#decodeButton"), language: document.querySelector("#languageButton"),
  chainMode: document.querySelector("#chainMode"), modeLabel: document.querySelector("#modeLabel"),
};

function byteToBits(value) {
  return Array.from({ length: 8 }, (_, index) => (value >> index) & 1).join("");
}

function bitsToByte(bits) {
  return [...bits].reduce((sum, bit, index) => sum | (Number(bit) << index), 0);
}

function buildCircuitOutput(frame) {
  return OUTPUT_BYTES[frame].map(byteToBits).join("");
}

function decodeOutput(raw) {
  const bits = raw.replace(/[^01]/g, "");
  const t = I18N[state.locale];
  if (bits.length !== 16) throw new Error(t.invalidLength);
  const ascii = bitsToByte(bits.slice(0, 8));
  const signature = bitsToByte(bits.slice(8, 16));
  const frame = SIGNATURES.indexOf(signature);
  if (frame < 0) throw new Error(t.invalidSignature);
  if (ascii !== OUTPUT_BYTES[frame][0]) throw new Error(t.invalidLetter);
  return { bits, frame, ascii, signature };
}

function setMode(mode) {
  state.source = mode;
  ui.chainMode.dataset.mode = mode;
  const key = mode === "chain" ? "chainLive" : mode === "error" ? "chainError" : "demo";
  ui.modeLabel.textContent = I18N[state.locale][key];
}

function render(frame, options = {}) {
  state.frame = frame;
  state.tick += options.advanceTick ? 1 : 0;
  const letter = LETTERS[frame];
  const direction = state.locale === "zh" ? DIRECTION_ZH[frame] : DIRECTIONS[frame];
  const [ascii, signature] = OUTPUT_BYTES[frame];
  ui.letters.forEach((element, index) => element.classList.toggle("active", index === frame));
  ui.diamonds.forEach((element, index) => element.classList.toggle("active", index === frame));
  ui.center.classList.toggle("pulse", frame % 2 === 1);
  ui.tick.textContent = String(state.tick).padStart(4, "0");
  ui.caption.textContent = `${letter} / ${direction}`;
  ui.activeLetter.textContent = letter;
  ui.direction.textContent = `BINANCE ◆ ${direction}`;
  ui.oneHot.textContent = `0x${signature.toString(16).toUpperCase()}`;
  ui.asciiHex.textContent = `0x${ascii.toString(16).toUpperCase()}`;
  ui.asciiText.textContent = `${letter} · HEYI ${frame + 1}/4`;
  if (!options.preserveInput) ui.rawBits.value = buildCircuitOutput(frame);
}

function applyLanguage() {
  const t = I18N[state.locale];
  document.documentElement.lang = state.locale === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = t[node.dataset.i18n]; });
  document.querySelectorAll("[data-i18n-html]").forEach((node) => { node.innerHTML = t[node.dataset.i18nHtml]; });
  ui.language.textContent = state.locale === "zh" ? "EN" : "中文";
  ui.auto.querySelector("span").textContent = t[state.autoplay ? "pause" : "play"];
  setMode(state.source);
  render(state.frame);
}

async function setupChain() {
  if (config.circuitId === null || config.circuitId === "" || !window.ethers) {
    setMode("demo");
    return false;
  }
  for (const rpcUrl of config.rpcUrls) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl, config.chainId, { staticNetwork: true });
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== config.chainId) continue;
      state.provider = provider;
      state.contract = new ethers.Contract(config.cpuAddress, [
        "function step(uint256 id, bytes state, bytes inputs) view returns (bytes newState, bytes outputs)",
      ], provider);
      setMode("chain");
      return true;
    } catch (_) {
      // Try the next public endpoint.
    }
  }
  setMode("error");
  return false;
}

async function chainStep() {
  const [newState, outputs] = await state.contract.step(config.circuitId, state.circuitState, config.inputs);
  state.circuitState = newState;
  const raw = [...ethers.getBytes(outputs)].map(byteToBits).join("").slice(0, 16);
  const decoded = decodeOutput(raw);
  render(decoded.frame, { advanceTick: true });
}

async function step() {
  if (state.source === "chain") {
    try {
      await chainStep();
      return;
    } catch (error) {
      setMode("error");
      ui.status.textContent = `${I18N[state.locale].chainError}: ${error.shortMessage || error.message}`;
    }
  }
  render((state.frame + 1) % LETTERS.length, { advanceTick: true });
}

function startAutoplay() {
  clearInterval(state.timer);
  state.timer = setInterval(step, state.source === "chain" ? 4200 : 1600);
  state.autoplay = true;
  ui.auto.querySelector("span").textContent = I18N[state.locale].pause;
  ui.auto.setAttribute("aria-pressed", "true");
}

function stopAutoplay() {
  clearInterval(state.timer);
  state.autoplay = false;
  ui.auto.querySelector("span").textContent = I18N[state.locale].play;
  ui.auto.setAttribute("aria-pressed", "false");
}

ui.step.addEventListener("click", async () => { stopAutoplay(); await step(); });
ui.auto.addEventListener("click", () => state.autoplay ? stopAutoplay() : startAutoplay());
ui.language.addEventListener("click", () => {
  state.locale = state.locale === "zh" ? "en" : "zh";
  localStorage.setItem("heyi-locale", state.locale);
  applyLanguage();
});
ui.decode.addEventListener("click", () => {
  try {
    const result = decodeOutput(ui.rawBits.value);
    stopAutoplay();
    render(result.frame, { advanceTick: true, preserveInput: true });
    const hex = `0x${result.ascii.toString(16).padStart(2, "0")}${result.signature.toString(16)}`.toUpperCase();
    const direction = state.locale === "zh" ? DIRECTION_ZH[result.frame] : DIRECTIONS[result.frame];
    ui.status.textContent = I18N[state.locale].valid(LETTERS[result.frame], direction, hex);
  } catch (error) {
    ui.status.textContent = error.message;
  }
});

applyLanguage();
setupChain().finally(startAutoplay);
