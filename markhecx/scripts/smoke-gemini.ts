import { config } from "../server/config/env";
import { GeminiProvider } from "../server/providers/gemini";
import { HecxError, errorMessage } from "../lib/mark/hecx/contracts";
try {
  const provider = new GeminiProvider({
    apiKey: config.GEMINI_API_KEY,
    model: config.GEMINI_MODEL,
    timeoutMs: config.HECX_TIMEOUT_MS,
  });
  await provider.smoke();
  console.log(
    JSON.stringify({
      status: "OK",
      provider: "Gemini",
      structuredResponseValidated: true,
      privateDataSent: false,
    }),
  );
} catch (e) {
  const safe = e instanceof HecxError ? e : new HecxError("unavailable");
  console.error(
    JSON.stringify({
      status: "failed",
      code: safe.code,
      message: errorMessage(safe),
    }),
  );
  process.exitCode = 1;
}
