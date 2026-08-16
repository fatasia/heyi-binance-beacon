const LETTERS = ["H", "E", "Y", "I"];
const DIRECTIONS = ["NORTH", "EAST", "SOUTH", "WEST"];
const DIRECTION_ZH = ["北", "东", "南", "西"];
const SIGNATURES = [0xb1, 0xb2, 0xb4, 0xb8];
const config = window.HE_YI_CONFIG;

const I18N = {
  en: {
    blockSignal: "BLOCK SIGNAL", permanentSignal: "A PERMANENT SIGNAL FOR",
    dedication: "Four letters, one circuit.<br />Clocked forever by BNB Chain.",
    liveOutput: "LIVE CIRCUIT OUTPUT", bitsName: "Her name shimmers in the circuit",
    pause: "PAUSE", play: "PLAY", stepSignal: "STEP",
    asciiPayload: "ASCII PAYLOAD", activeLetterLabel: "ACTIVE LETTER",
    oneHot: "B + ONE-HOT DIRECTION",
    callReceipt: "ON-CHAIN CALL RECEIPT", nothingSimulated: "Every pulse, witnessed on-chain",
    chainOnly: "Every visible frame is returned by a BNB Chain eth_call. If the chain cannot be reached, the signal stops.",
    viewCircuit: "VIEW TAPEOUT CIRCUIT #1 ↗", viewTransaction: "VIEW BSCSCAN TX ↗",
    processorContract: "PROCESSOR CONTRACT", circuit: "CIRCUIT", method: "METHOD",
    requestState: "REQUEST STATE", returnedState: "RETURNED STATE", rawOutput: "RAW OUTPUT",
    blockHeight: "BLOCK HEIGHT", rpcSource: "RPC SOURCE", creationTx: "CREATION TX",
    targetProcessor: "TARGET PROCESSOR", footerLine: "TO HE YI <b>◆</b> FOREVER ON BNB CHAIN",
    invalidLength: "The circuit did not return two output bytes.",
    invalidSignature: "Byte 1 is not a valid Binance B1/B2/B4/B8 signature.",
    invalidLetter: "ASCII byte does not match the active HEYI frame.",
    chainLive: "ON-CHAIN", connecting: "CONNECTING", offline: "UNAVAILABLE",
    waiting: "Waiting for BNB Chain…", verifiedAt: (block) => `Verified by eth_call at block ${block}.`,
    unavailable: "BNB Chain is unavailable. The last verified frame is frozen; no local fallback is running.",
    retry: "RETRY", waitingFrame: "WAITING FOR CHAIN",
  },
  zh: {
    blockSignal: "区块信号", permanentSignal: "一束永久的链上信号，献给",
    dedication: "四个字母，一枚电路。<br />由 BNB Chain 永久驱动。",
    liveOutput: "实时电路输出", bitsName: "她的名字，在电路中闪烁",
    pause: "暂停", play: "播放", stepSignal: "下一帧",
    asciiPayload: "ASCII 字符", activeLetterLabel: "当前字母",
    oneHot: "B + 单热方向信号",
    callReceipt: "链上调用回执", nothingSimulated: "每一次跳动，都由链上见证",
    chainOnly: "每一帧都由 BNB Chain 的 eth_call 返回；无法连接链上时，信号会停止。",
    viewCircuit: "查看 TAPEOUT 电路 #1 ↗", viewTransaction: "查看 BSCSCAN 交易 ↗",
    processorContract: "处理器合约", circuit: "电路", method: "调用方法",
    requestState: "请求状态", returnedState: "返回状态", rawOutput: "原始输出",
    blockHeight: "区块高度", rpcSource: "RPC 来源", creationTx: "创建交易",
    targetProcessor: "目标处理器", footerLine: "献给何一 <b>◆</b> 永存于 BNB CHAIN",
    invalidLength: "电路没有返回两个输出字节。",
    invalidSignature: "第 1 字节不是有效的 Binance B1/B2/B4/B8 签名。",
    invalidLetter: "ASCII 字节与当前 HEYI 帧不匹配。",
    chainLive: "链上", connecting: "连接中", offline: "不可用",
    waiting: "正在连接 BNB Chain…", verifiedAt: (block) => `已通过 eth_call 在区块 ${block} 验证。`,
    unavailable: "BNB Chain 暂时不可用。最后一帧已冻结；页面不会播放本地兜底数据。",
    retry: "重连", waitingFrame: "等待链上信号",
  },
};

const state = {
  frame: null, autoplay: false, timer: null, busy: false,
  locale: localStorage.getItem("heyi-locale") || "zh",
  source: "connecting", circuitState: config.initialState, provider: null, contract: null,
  rpcUrl: null, lastResult: null, lastError: null,
};

const ui = {
  letters: [...document.querySelectorAll("[data-letter]")],
  diamonds: [...document.querySelectorAll("[data-direction]")],
  center: document.querySelector(".diamond.center"), tick: document.querySelector("#tickLabel"),
  caption: document.querySelector("#frameCaption"), activeLetter: document.querySelector("#activeLetter"),
  direction: document.querySelector("#directionText"), oneHot: document.querySelector("#oneHotBits"),
  asciiHex: document.querySelector("#asciiHex"), asciiText: document.querySelector("#asciiText"),
  step: document.querySelector("#stepButton"), auto: document.querySelector("#autoButton"),
  language: document.querySelector("#languageButton"),
  chainMode: document.querySelector("#chainMode"), modeLabel: document.querySelector("#modeLabel"),
  callStatus: document.querySelector("#callStatus"), receiptContract: document.querySelector("#receiptContract"),
  receiptCircuit: document.querySelector("#receiptCircuit"), receiptMethod: document.querySelector("#receiptMethod"),
  receiptRequestState: document.querySelector("#receiptRequestState"), receiptNewState: document.querySelector("#receiptNewState"),
  receiptOutput: document.querySelector("#receiptOutput"), receiptBlock: document.querySelector("#receiptBlock"),
  receiptRpc: document.querySelector("#receiptRpc"),
};

function decodeOutput(outputBytes) {
  const t = I18N[state.locale];
  if (outputBytes.length < 2) throw new Error(t.invalidLength);
  const ascii = outputBytes[0];
  const signature = outputBytes[1];
  const frame = SIGNATURES.indexOf(signature);
  if (frame < 0) throw new Error(t.invalidSignature);
  if (ascii !== LETTERS[frame].charCodeAt(0)) throw new Error(t.invalidLetter);
  return { frame, ascii, signature };
}

function setMode(mode) {
  state.source = mode;
  ui.chainMode.dataset.mode = mode;
  const key = mode === "chain" ? "chainLive" : mode === "offline" ? "offline" : "connecting";
  ui.modeLabel.textContent = I18N[state.locale][key];
  const unavailable = mode !== "chain" || state.busy;
  ui.step.disabled = unavailable;
  ui.auto.disabled = unavailable;
}

function render(result) {
  state.frame = result.frame;
  state.lastResult = result;
  const { frame, ascii, signature } = result;
  const letter = LETTERS[frame];
  const direction = state.locale === "zh" ? DIRECTION_ZH[frame] : DIRECTIONS[frame];
  ui.letters.forEach((element, index) => element.classList.toggle("active", index === frame));
  ui.diamonds.forEach((element, index) => element.classList.toggle("active", index === frame));
  ui.center.classList.toggle("pulse", frame % 2 === 1);
  ui.tick.textContent = String(result.blockNumber);
  ui.caption.textContent = `${letter} / ${direction}`;
  ui.activeLetter.textContent = letter;
  ui.direction.textContent = `BINANCE ◆ ${direction}`;
  ui.oneHot.textContent = `0x${signature.toString(16).toUpperCase()}`;
  ui.asciiHex.textContent = `0x${ascii.toString(16).toUpperCase()}`;
  ui.asciiText.textContent = `${letter} · HEYI ${frame + 1}/4`;
  ui.receiptRequestState.textContent = result.requestState;
  ui.receiptNewState.textContent = result.newState;
  ui.receiptOutput.textContent = result.rawOutput;
  ui.receiptBlock.textContent = String(result.blockNumber);
  ui.receiptRpc.textContent = result.rpcUrl;
  ui.callStatus.textContent = state.source === "offline"
    ? I18N[state.locale].unavailable
    : I18N[state.locale].verifiedAt(result.blockNumber);
}

function applyLanguage() {
  const t = I18N[state.locale];
  document.documentElement.lang = state.locale === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = t[node.dataset.i18n]; });
  document.querySelectorAll("[data-i18n-html]").forEach((node) => { node.innerHTML = t[node.dataset.i18nHtml]; });
  ui.language.textContent = state.locale === "zh" ? "EN" : "中文";
  ui.auto.querySelector("span").textContent = t[state.autoplay ? "pause" : "play"];
  setMode(state.source);
  ui.receiptCircuit.textContent = `#${config.circuitId}`;
  ui.receiptMethod.textContent = "step(uint256,bytes,bytes)";
  if (state.lastResult) render(state.lastResult);
  else {
    ui.caption.textContent = t.waitingFrame;
    ui.asciiText.textContent = t.waitingFrame;
    ui.callStatus.textContent = state.source === "offline" ? t.unavailable : t.waiting;
  }
}

async function setupChain() {
  stopAutoplay();
  state.busy = true;
  setMode("connecting");
  ui.callStatus.textContent = I18N[state.locale].waiting;
  state.circuitState = config.initialState;
  if (config.circuitId === null || config.circuitId === "" || !window.ethers) return setOffline(new Error("Missing chain configuration"));
  for (const rpcUrl of config.rpcUrls) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl, config.chainId, { staticNetwork: true });
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== config.chainId) continue;
      const contract = new ethers.Contract(config.cpuAddress, [
        "function step(uint256 id, bytes state, bytes inputs) view returns (bytes newState, bytes outputs)",
      ], provider);
      const result = await readChainStep(provider, contract, rpcUrl, config.initialState);
      state.provider = provider;
      state.contract = contract;
      state.rpcUrl = rpcUrl;
      state.circuitState = result.newState;
      state.busy = false;
      setMode("chain");
      render(result);
      startAutoplay();
      return true;
    } catch (error) {
      state.lastError = error;
      // Try the next public endpoint.
    }
  }
  return setOffline(state.lastError || new Error("No BNB Chain RPC available"));
}

async function readChainStep(provider, contract, rpcUrl, requestState) {
  const blockNumber = await provider.getBlockNumber();
  const [newState, outputs] = await contract.step(config.circuitId, requestState, config.inputs, { blockTag: blockNumber });
  const outputBytes = [...ethers.getBytes(outputs)];
  const decoded = decodeOutput(outputBytes);
  return {
    ...decoded,
    requestState,
    newState,
    rawOutput: `0x${outputBytes.slice(0, 2).map((byte) => byte.toString(16).padStart(2, "0")).join("")}`.toUpperCase().replace(/^0X/, "0x"),
    blockNumber,
    rpcUrl,
  };
}

async function step() {
  if (state.source !== "chain" || state.busy) return;
  state.busy = true;
  setMode("chain");
  try {
    const result = await readChainStep(state.provider, state.contract, state.rpcUrl, state.circuitState);
    state.circuitState = result.newState;
    render(result);
  } catch (error) {
    setOffline(error);
  } finally {
    if (state.source === "chain") {
      state.busy = false;
      setMode("chain");
    }
  }
}

function startAutoplay() {
  if (state.source !== "chain") return;
  clearInterval(state.timer);
  state.timer = setInterval(step, 4200);
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

function setOffline(error) {
  stopAutoplay();
  state.busy = false;
  state.lastError = error;
  setMode("offline");
  ui.callStatus.textContent = I18N[state.locale].unavailable;
  return false;
}

ui.step.addEventListener("click", async () => { stopAutoplay(); await step(); });
ui.auto.addEventListener("click", () => state.autoplay ? stopAutoplay() : startAutoplay());
ui.language.addEventListener("click", () => {
  state.locale = state.locale === "zh" ? "en" : "zh";
  localStorage.setItem("heyi-locale", state.locale);
  applyLanguage();
});

ui.receiptContract.textContent = config.cpuAddress;
ui.receiptContract.href = `https://bscscan.com/address/${config.cpuAddress}`;
ui.receiptCircuit.textContent = `#${config.circuitId}`;
ui.receiptMethod.textContent = "step(uint256,bytes,bytes)";
applyLanguage();
setupChain();
