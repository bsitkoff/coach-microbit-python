// Microbit Coach Extension — DEBUG VERSION
(async function (codioIDE, window) {

  // Toggle verbose debugging
  const DEBUG = true;

  function dbg(msg) {
    if (DEBUG) {
      try {
        codioIDE.coachBot.write("DEBUG: " + msg);
      } catch (err) {
        // ignore UI write failures
      }
    }
  }

  // -----------------------------
  // Allowed Docs (from repo)
  // -----------------------------
  const allowedDocs = [
    "https://microbit-micropython.readthedocs.io/en/v2-docs/",
    "https://microbit-micropython.readthedocs.io/en/v2-docs/tutorials/",
    "https://microbit-micropython.readthedocs.io/en/v2-docs/tutorials/buttons.html",
    "https://microbit-micropython.readthedocs.io/en/v2-docs/tutorials/images.html",
    "https://microbit-micropython.readthedocs.io/en/v2-docs/tutorials/input_output.html",
    "https://microbit-micropython.readthedocs.io/en/v2-docs/tutorials/music.html",
    "https://microbit-micropython.readthedocs.io/en/v2-docs/tutorials/radio.html",
    "https://microbit-micropython.readthedocs.io/en/v2-docs/tutorials/microphone.html",
    "https://microbit-micropython.readthedocs.io/en/v2-docs/microbit_micropython_api.html",
    "https://microbit-micropython.readthedocs.io/en/v2-docs/microbit.html",
    "https://microbit-micropython.readthedocs.io/en/v2-docs/button.html",
    "https://microbit-micropython.readthedocs.io/en/v2-docs/display.html",
    "https://microbit-micropython.readthedocs.io/en/v2-docs/accelerometer.html",
    "https://microbit-micropython.readthedocs.io/en/v2-docs/compass.html",
    "https://microbit-micropython.readthedocs.io/en/v2-docs/radio.html",
    "https://microbit-micropython.readthedocs.io/en/v2-docs/neopixel.html"
  ];

  // -----------------------------
  // SYSTEM PROMPT — as defined by repo policies
  // -----------------------------
  const systemPrompt = `
You are “Micro:bit Python Coach,” helping students learn BBC micro:bit MicroPython.

Rules:
- Correct errors, explain concepts, and give small hints.
- Never provide full programs or complete assignment solutions.
- Any code example must be ≤5 lines and include a TODO or placeholder so it is not turnkey.
- Ask at least one clarifying question before providing code if a request might imply a full solution.
- Only cite pages from the allowed MicroPython documentation list.
- If uncertain, say so and point to the closest relevant documentation.
- If asked for a full solution: politely refuse, explain why, offer a plan, and give a tiny micro-example.

Allowed documentation:
${allowedDocs.join("\n")}

Promote independent problem solving.
  `;

  // -----------------------------
  // Collect Python files with logging
  // -----------------------------
  async function collectPythonFiles() {
    dbg("collectPythonFiles() called");

    if (!codioIDE.workspace) {
      dbg("workspace object is MISSING");
      return "";
    }

    dbg("workspace object exists");

    if (typeof codioIDE.workspace.getFileTree !== "function") {
      dbg("workspace.getFileTree is NOT a function");
      return "";
    }

    dbg("workspace.getFileTree() is available — calling it now");

    let tree;
    try {
      tree = await codioIDE.workspace.getFileTree();
      dbg("File tree received");
      dbg(JSON.stringify(tree, null, 2));
    } catch (err) {
      dbg("ERROR calling workspace.getFileTree(): " + err.message);
      return "";
    }

    const files = findPythonFiles(tree);
    dbg("Python files detected: " + JSON.stringify(files));

    let out = "";
    for (const fp of files) {
      try {
        dbg("Reading file: " + fp);
        const content = await codioIDE.workspace.readFile(fp);

        if (!content) {
          dbg("Empty content for " + fp);
          continue;
        }

        const limit = 15000;
        if (content.length <= limit) {
          out += `\n\n### File: ${fp}\n\`\`\`\n${content}\n\`\`\`\n`;
        } else {
          out += `\n\n### File: ${fp} (truncated)\n\`\`\`\n${content.slice(0, limit)}\n...(truncated)\n\`\`\`\n`;
        }
      } catch (err) {
        dbg("ERROR reading file " + fp + ": " + err.message);
      }
    }

    return out;
  }

  function findPythonFiles(node, prefix = "") {
    let out = [];

    if (!node || !node.children) {
      dbg("findPythonFiles(): node has no children at prefix=" + prefix);
      return out;
    }

    dbg("Scanning children at prefix=" + prefix);

    for (const item of node.children) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;

      if (item.type === "file") {
        const low = item.name.toLowerCase();
        if (low.endsWith(".py")) {
          dbg("Found .py file: " + full);
          out.push(full);
        }
      } else if (item.type === "directory") {
        dbg("Descending into directory: " + full);
        out = out.concat(findPythonFiles(item, full));
      }
    }

    return out;
  }

  // -----------------------------
  // Build context
  // -----------------------------
  async function buildEnhancedContext(baseContext) {
    dbg("buildEnhancedContext() called");

    const pythonFiles = await collectPythonFiles();

    dbg("workspacePython length = " + pythonFiles.length);

    return {
      ...baseContext,
      workspacePython: pythonFiles,
      allowedDocs: allowedDocs
    };
  }

  // -----------------------------
  // Register the Coach Button
  // -----------------------------
  codioIDE.coachBot.register(
    "microbitHelpButton",
    "I have a micro:bit question",
    onButtonPress
  );

  async function onButtonPress() {
    dbg("Button pressed — starting coach flow");

    let context = await codioIDE.coachBot.getContext();
    dbg("Got context from Codio:");
    dbg(JSON.stringify(context, null, 2));

    const enhanced = await buildEnhancedContext(context);

    let messages = [];

    while (true) {
      const input = await codioIDE.coachBot.input();

      if (input.toLowerCase() === "thanks") {
        break;
      }

      const injectContext =
        messages.length === 0 && enhanced.workspacePython;

      if (injectContext) {
        dbg("Injecting workspace Python context into first user message");
      } else {
        dbg("NOT injecting workspace context (messages.length=" + messages.length + ")");
      }

      const userContent =
        injectContext
          ? input +
            "\n\n---\n\n**CONTEXT: Student Workspace (.py files)**\n" +
            enhanced.workspacePython
          : input;

      messages.push({ role: "user", content: userCont
