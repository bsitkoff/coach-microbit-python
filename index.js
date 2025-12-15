// Microbit Coach Extension — SAFE DEBUG VERSION
(async function(codioIDE, window) {

  const DEBUG = true;

  function dbg(msg) {
    if (!DEBUG) return;
    try {
      codioIDE.coachBot.write("DEBUG: " + msg);
    } catch (e) {
      // Never allow debug logs to break the extension
    }
  }

  // -----------------------------------------
  // Minimal System Prompt (unchanged behavior)
  // -----------------------------------------
  const systemPrompt = `
You are “Micro:bit Python Coach,” helping students learn BBC micro:bit MicroPython.
(omitted here for brevity—use your exact prompt)
  `;

  // -----------------------------------------
  // Collect python files with SAFE debugging
  // -----------------------------------
