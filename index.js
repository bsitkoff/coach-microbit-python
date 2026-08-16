// Microbit Coach Extension
(async function(codioIDE, window) {

  const VERSION = "1.9.0";

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

  const systemPrompt = `You are a friendly and helpful coding coach for students learning BBC micro:bit MicroPython.

When helping students:
- Keep responses short — 2-3 sentences for simple questions, a short paragraph for bigger concepts.
- Use plain language: "This line checks if button A is being pressed" not "This evaluates the button state."
- Be encouraging: "Great question!", "You're really close!", "Nice start!"
- Always look at the student's actual code (in <files> tags) before answering.
- Reference the assignment guide (in <guide> tags) to understand what they're working on.
- Base your advice on the official MicroPython docs. When relevant, mention which doc page has more info.

Allowed documentation sources:
${allowedDocs.join("\n")}

What you CAN do:
- Explain what an error message means in plain language.
- Point out bugs in their code and suggest specific fixes.
- Write short example snippets (3-5 lines) that show how a micro:bit concept works, with explanations of each line.
- Help them think through their logic step by step.
- Show small code examples with TODOs or comments so students know where to adapt them.

What you CANNOT do:
- Write complete programs or full solutions to assignments.
- Do their homework for them. If they ask, say: "I can't write that for you, but let me help you figure it out! What part are you stuck on?" Then outline 3-5 steps they can follow.
- Answer questions outside of course content.
- Make up micro:bit APIs that don't exist. If unsure, say so and point to the closest doc page.

## Diagnosing vs. solving

There are two very different kinds of help, and you should treat them differently.

**Diagnosing — be direct and specific. Point right at the problem:**
- Error messages and tracebacks (NameError, SyntaxError, IndentationError, etc.) — explain what the error is saying in plain English and point to the exact line.
- Typos in API names (e.g. button_a vs Button_A, display.scroll vs display.Scroll).
- Missing punctuation: missing colon after if/while/def, missing parentheses, wrong indentation.
- A wrong pin or API name — point to the closest doc page if you're not sure of the exact one.

For these, just tell them what's wrong and where. They can fix it themselves once they see it.

**Solving — make THEM do the work:**
- "How do I make the LEDs do X?" / "How do I use the accelerometer to detect a shake?" / "How do I make the radio send a message?" — these are design questions, not bug questions. Ask a clarifying question first (what have they tried? what do they think the first step is?), then teach the concept and have them try it themselves.
- "Can you write this program for me?" — politely refuse and explain why ("that's the part you're learning!"), then give a short plan (3-5 steps) and, if it helps, a tiny non-solution example (3-5 lines, with a TODO) that illustrates one piece without solving the whole thing.
- "Make my project work" — break it into the smallest first step ("Let's start with just reading button_a. What should happen when it's pressed?") and only help with that one step.

When refusing a full-solution request, keep this shape: a one-sentence refusal, a one-sentence reason tied to learning, a short numbered plan, and (if helpful) a tiny example with a TODO — never the finished code.`;

  const exitPhrases = ["thanks", "thank you", "bye", "done", "exit", "quit", "stop", "no thanks", "i'm good", "im good", "that's all", "thats all"];

  // Collect .py files via codioIDE.files (supplement to context.files, which
  // only lists files currently OPEN in the editor). codioIDE.workspace does
  // NOT exist in the Custom Assistant runtime — codioIDE.files is the
  // supported channel: https://codio.github.io/client/codioIDE.files.html
  async function collectPythonFiles(skipPaths) {
    let out = "";
    const totalBudget = 40000;
    const F = codioIDE.files;
    if (!F || typeof F.getStructure !== "function" || typeof F.getContent !== "function") return out;

    let files = [];
    try {
      files = findRelevantFiles(await F.getStructure(), "");
    } catch (err) {
      return out;
    }

    for (const filePath of files) {
      if (out.length >= totalBudget) break;
      if (skipPaths && skipPaths.has(normalizePath(filePath))) continue;

      try {
        const content = await F.getContent(filePath);
        if (typeof content !== "string" || content.length === 0) continue;
        const maxLen = Math.min(15000, totalBudget - out.length);

        if (content.length <= maxLen) {
          out += `\nFile: ${filePath}\n${content}\n`;
        } else {
          out += `\nFile: ${filePath} (truncated)\n${content.slice(0, maxLen)}\n...(truncated)\n`;
        }
      } catch (err) {
        // Silent
      }
    }

    return out;
  }

  function normalizePath(p) {
    return String(p).replace(/^\.\//, "").replace(/^\//, "");
  }

  // getStructure() returns a name->value MAP: a file's value is a leaf (Codio
  // uses 1), a directory's value is a nested map — not an array of nodes.
  function findRelevantFiles(node, path) {
    let out = [];
    if (!node || typeof node !== "object") return out;

    for (const name in node) {
      if (!Object.prototype.hasOwnProperty.call(node, name)) continue;
      if (name.startsWith(".")) continue;
      const full = path ? `${path}/${name}` : name;
      const value = node[name];

      if (value && typeof value === "object") {
        out = out.concat(findRelevantFiles(value, full));
      } else if (name.toLowerCase().endsWith(".py")) {
        out.push(full);
      }
    }
    return out;
  }

  // Register the button in Codio
  codioIDE.coachBot.register("microbitHelp", "Microbit Coach", onPress);

  // Build the context-bearing first message from a fresh getContext() +
  // codioIDE.files read. Re-run before every ask() so the coach sees the
  // student's latest edits, not their code as of the button press.
  async function buildContextMessage(initialInput) {
    const context = await codioIDE.coachBot.getContext();

    // Build file context from context.files + project .py files
    let filesContent = "";
    if (context.files && context.files.length > 0) {
      filesContent = context.files.map(f => `File: ${f.path}\n${f.content}`).join('\n\n');
    }

    // Supplement with project .py files (may catch files context.files misses)
    const openPaths = new Set((context.files || []).map(f => normalizePath(f.path)));
    const workspacePy = await collectPythonFiles(openPaths);
    if (workspacePy) {
      filesContent += (filesContent ? '\n\n' : '') + workspacePy;
    }

    if (!filesContent) {
      filesContent = "No files available.";
    }

    const guideContent = (context.guidesPage && context.guidesPage.content)
      ? context.guidesPage.content
      : "No guide available.";

    const assignmentName = (context.assignmentData && context.assignmentData.name)
      ? context.assignmentData.name
      : null;

    return `Here are the student's files (current as of their latest question):
<files>
${filesContent}
</files>
Here is the assignment guide:
<guide>
${guideContent}
</guide>
${assignmentName ? `\nAssignment: ${assignmentName}\n` : ''}
The student says: ${initialInput}`;
  }

  async function onPress() {
    codioIDE.coachBot.write(
      `Microbit Coach v${VERSION} - Ask me your micro:bit questions!`,
      codioIDE.coachBot.MESSAGE_ROLES.ASSISTANT
    );

    let messages = [];

    let initialInput;
    while (true) {
      try {
        initialInput = await codioIDE.coachBot.input("What can I help you with?");
      } catch (e) {
        codioIDE.coachBot.showMenu();
        return;
      }

      if (initialInput === "version") {
        codioIDE.coachBot.write(`Current version: ${VERSION}`, codioIDE.coachBot.MESSAGE_ROLES.ASSISTANT);
        continue;
      }

      break;
    }

    messages.push({ "role": "user", "content": await buildContextMessage(initialInput) });

    try {
      codioIDE.coachBot.showThinkingAnimation();
      const result = await codioIDE.coachBot.ask({
        systemPrompt: systemPrompt,
        messages: messages
      }, { preventMenu: true });
      messages.push({ "role": "assistant", "content": result.result });
    } catch (e) {
      codioIDE.coachBot.write("Hmm, something went wrong on my end. Try asking that again!");
      messages.pop();
    } finally {
      codioIDE.coachBot.hideThinkingAnimation();
    }

    while (true) {
      let input;
      try {
        input = await codioIDE.coachBot.input("What else can I help you with? (Say 'thanks' when you're done!)");
      } catch (e) {
        break;
      }

      if (input === "version") {
        codioIDE.coachBot.write(`Current version: ${VERSION}`, codioIDE.coachBot.MESSAGE_ROLES.ASSISTANT);
        continue;
      }

      const trimmedInput = input.trim().toLowerCase();
      if (exitPhrases.includes(trimmedInput)) {
        break;
      }

      messages.push({ "role": "user", "content": input });

      // Refresh the context block so the coach sees the student's latest edits
      try {
        messages[0] = { "role": "user", "content": await buildContextMessage(initialInput) };
      } catch (e) {
        // Keep the previous context if the refresh fails
      }

      try {
        codioIDE.coachBot.showThinkingAnimation();
        const result = await codioIDE.coachBot.ask({
          systemPrompt: systemPrompt,
          messages: messages
        }, { preventMenu: true });
        messages.push({ "role": "assistant", "content": result.result });
      } catch (e) {
        codioIDE.coachBot.write("Hmm, something went wrong on my end. Try asking that again!");
        messages.pop();
        continue;
      } finally {
        codioIDE.coachBot.hideThinkingAnimation();
      }

      // Keep first message (with files + guide) + last 8 messages (4 exchanges)
      while (messages.length > 9) {
        messages.splice(1, 2); // drop the oldest assistant+user pair, keep messages[0] (context) intact
      }
    }

    codioIDE.coachBot.write("You're welcome! Happy coding with your micro:bit.");
    codioIDE.coachBot.showMenu();
  }

})(window.codioIDE, window);
