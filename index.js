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
You are "Micro:bit Python Coach" for students learning BBC micro:bit MicroPython.
Strict teaching policy:
- You correct errors, suggest improvements, and explain concepts.
- You do NOT write full, runnable programs or assignment solutions.
- When code is appropriate, provide at most 3–5 lines that illustrate an idea, with TODOs or placeholders so it is not a turnkey answer.
- Always ask at least one clarifying question when the request could lead to a complete solution.
- Ground advice in the official docs and cite the specific API page from the allowed list.
- If the student asks for a full solution, politely refuse, explain why, and give strategy + a tiny, non-solution example.

Output expectations:
- Prefer step-by-step reasoning at a high level; keep code minimal and partial.
- Use diff-style or inline suggestions instead of full files.
- When refusing, offer a plan the student can execute and a micro-example that is not the answer.

Safety and integrity:
- Do not invent Micro:bit APIs; stick to the allowed docs.
- If uncertain, say so and point to the relevant doc section.
  `;

  // -----------------------------------------
  // Collect python files with SAFE debugging
  // -----------------------------------------
  async function collectPythonFiles() {
    dbg("Collecting python files...");

    if (!codioIDE.workspace) {
      dbg("workspace MISSING");
      return "";
    }

    if (typeof codioIDE.workspace.getFileTree !== "function") {
      dbg("getFileTree() NOT available");
      return "";
    }

    let tree;
    try {
      tree = await codioIDE.workspace.getFileTree();
      dbg("getFileTree() returned a tree");
    } catch (e) {
      dbg("getFileTree() ERROR: " + e.message);
      return "";
    }

    const files = [];
    scan(tree, "", files);

    dbg("Python files found: " + files.join(", "));

    let dump = "";
    for (const f of files) {
      try {
        const content = await codioIDE.workspace.readFile(f);
        dump += `\n### File: ${f}\n\`\`\`\n${content}\n\`\`\`\n`;
      } catch (e) {
        dbg("readFile ERROR for " + f + ": " + e.message);
      }
    }

    return dump;
  }

  function scan(node, prefix, out) {
    if (!node.children) return;
    for (const child of node.children) {
      const full = prefix ? prefix + "/" + child.name : child.name;
      if (child.type === "file" && child.name.toLowerCase().endsWith(".py")) {
        out.push(full);
      }
      if (child.type === "directory") {
        scan(child, full, out);
      }
    }
  }

  // -----------------------------------------
  // Button Registration
  // -----------------------------------------
  codioIDE.coachBot.register("microbitHelpButton", "I have a micro:bit question", onPress);

  async function onPress() {
    dbg("Button pressed.");

    // Try to get context
    let context;
    try {
      context = await codioIDE.coachBot.getContext();
      dbg("Context received.");
    } catch (e) {
      dbg("getContext ERROR: " + e.message);
      return;
    }

    // Try to load python files
    const pythonDump = await collectPythonFiles();
    if (pythonDump.length === 0) {
      dbg("No python files loaded.");
    } else {
      dbg("Python file context prepared.");
    }

    // Begin chat loop
    let messages = [];
    while (true) {
      const input = await codioIDE.coachBot.input();
      if (input.toLowerCase() === "thanks") break;

      const firstTurn = messages.length === 0;

      messages.push({
        role: "user",
        content: firstTurn
          ? input + "\n\n---\n\n" + pythonDump
          : input
      });

      dbg("Sending request to model...");

      let result;
      try {
        result = await codioIDE.coachBot.ask(
          { systemPrompt, messages, context },
          { preventMenu: true }
        );
      } catch (e) {
        dbg("ask() ERROR: " + e.message);
        break;
      }

      messages.push({ role: "assistant", content: result.result });

      if (messages.length > 10) messages.splice(0, 2);
    }

    codioIDE.coachBot.write("You're welcome!");
    codioIDE.coachBot.showMenu();
  }

})(window.codioIDE, window);
