# HE YI × Binance Beacon

A bilingual companion visualizer for the HE YI TapeOut circuit. It runs in demo mode before tapeout and switches to read-only BNB Chain execution after a circuit ID is configured.

- Live site: <https://fatasia.github.io/heyi-binance-beacon/>
- TapeOut processor: <https://tapeout.net/#p/0x23745cf93FA92669590B882b3C6DB0D1329FcFA5>
- Tapeout transaction: <https://bscscan.com/tx/0x0b9d3efc9ca7caab9e36ef003c9397cdec2fffb193d736eb6dc636a2faac1410>

## Output contract

- `OUT0..OUT7`: one ASCII letter per frame (`H`, `E`, `Y`, `I`), least-significant bit first.
- `OUT8..OUT15`: Binance signature plus one-hot direction (`B1`, `B2`, `B4`, `B8`).
- Four frames: `0x48B1`, `0x45B2`, `0x59B4`, `0x49B8`.

The page accepts exactly 16 raw output bits and decodes both the ASCII letter and Binance direction signature.

## Chain mode

Circuit `#1` is live. The page calls `step(id,state,inputs)` on the target processor through a public BNB Chain RPC. No wallet is required for read-only execution.

The GitHub Pages files themselves are hosted off-chain. The circuit identity, logic and decoded output are sourced from the on-chain processor.

The verified circuit specification and full netlist are archived in [`CIRCUIT.md`](./CIRCUIT.md).

## Run locally

Serve this directory with any static HTTP server and open `index.html`.
