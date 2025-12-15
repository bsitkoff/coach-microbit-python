// Microbit Coach Extension
(async function(codioIDE, window) {

  // Allowed docs list (from tools/docs_index.json)
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

  // System prompt assembled from all repo policies
  const systemPrompt = `
You are “Micro:bit Python Coach,” helping students learn BBC micro:bit MicroPython.

Core teaching rules:
- Correct errors, explain concepts, and provide small hints. You never produce full programs or assignment solutions.
- When giving code, provide only tiny examples (3–5 lines) that illustrate an idea. Use TODOs or placeholders so examples are never turnkey.
- Ask at least one clarifying question whenever the request could imply producing a complete solution.
- Always base explanations on the official MicroPython docs listed below. Cite a specific API page when giving technical advice.
- If uncertain, say so and point to the closest doc page. Do not invent APIs.

Allowed documentation sources:
${allowedDocs.join("\n")}

Refusal rules:
- If the student requests a full solution, politely refuse, explain why, outline a short plan, give a ≤5-line micro-example that teaches one sub-skill, and cite the relevant API page.
- If the student wishes to discuss something outside of the assignment (homework for other classses, general knowledge, etc.) politely redirect them back to the assignment.

Academic integrity:
- Promote independent problem solving. Provide hints and reasoning, not completed work.

Output expectations:
- Prefer short reasoning and tiny code snippets over full functions.
- Prefer diffs, inline suggestions, small steps, and conceptual guidance.
- Use the student's actual .py files for reference whenever possible.
  `;

  const DEBUG = false;

  // Collect .py files from workspace (similar to Data Stories extension)
  async function collectPythonFiles() {
    let out = "";
    if (!codioIDE.workspace || !codioIDE.workspace.getFileTree) return out;

    try {
      const tree = await codioIDE.workspace.getFileTree();
      const files = findRelevantFiles(tree);

      for (const filePath of files) {
        try {
          const content = await codioIDE.workspace.readFile(filePath);
          const maxLen = 15000;

          if (content.length <= maxLen) {
            out += `\n\n### File: ${filePath}\n\`\`\`\n${content}\n\`\`\`\n`;
          } else {
            out += `\n\n### File: ${filePath} (truncated)\n\`\`\`\n${content.slice(0, maxLen)}\n...(truncated)\n\`\`\`\n`;
          }
        } catch (err) {
          if (DEBUG) codioIDE.coachBot.write("Could not read " + filePath + ": " + err.message);
        }
      }
    } catch (err) {
      if (DEBUG) codioIDE.coachBot.write("Error reading file tree: " + err.message);
    }

    return out;
  }

  function findRelevantFiles(node, path = "") {
    let out = [];
    if (!node.children) return out;

    for (const item of node.children) {
      const full = path ? `${path}/${item.name}` : item.name;

      if (item.type === "file") {
        const low = item.name.toLowerCase();
        if (!item.name.startsWith(".") && low.endsWith(".py")) {
          out.push(full);
        }
      } else if (item.type === "directory" && !item.name.startsWith(".")) {
        out = out.concat(findRelevantFiles(item, full));
      }
    }
    return out;
  }

  async function buildEnhancedContext(base) {
    const pythonFiles = await collectPythonFiles();
    return {
      ...base,
      workspacePython: pythonFiles,
      allowedDocs: allowedDocs
    };
  }

  // Register the button in Codio
  codioIDE.coachBot.register("microbitHelp", "I have a micro:bit question", onPress);

  async function onPress() {
    const ctx = await codioIDE.coachBot.getContext();
    const enhanced = await buildEnhancedContext(ctx);

    let messages = [];

    while (true) {
      const input = await codioIDE.coachBot.input();

      if (input === "Thanks" || input.toLowerCase() === "thanks") {
        break;
      }

      const userContent =
        messages.length === 0 && enhanced.workspacePython
          ? input +
            "\n\n---\n\n**CONTEXT: Student Workspace (.py files)**\n" +
            enhanced.workspacePython
          : input;

      messages.push({ role: "user", content: userContent });

      const result = await codioIDE.coachBot.ask(
        {
          systemPrompt: systemPrompt,
          messages: messages,
          context: enhanced
        },
        { preventMenu: true }
      );

      messages.push({
        role: "assistant",
        content: result.result
      });

      if (messages.length > 10) {
        messages.splice(0, 2);
      }
    }

    codioIDE.coachBot.write("You're welcome! Happy coding with your micro:bit.");
    codioIDE.coachBot.showMenu();
  }

})(window.codioIDE, window);
