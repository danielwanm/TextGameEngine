import type { Game, Node, Option, DialogLine } from './types.ts';
import { parseGameScript, getCharacterAssets } from './parser.ts';

const SPEECH_BUBBLE_LEFT = new URL('./images/speechBubbleLeft.png', import.meta.url).href;
const SPEECH_BUBBLE_RIGHT = new URL('./images/speechBubbleRight.png', import.meta.url).href;

const appContainer = document.getElementById('appContainer')!;
const mainHeader = document.getElementById('mainHeader')!;
const startButton = document.getElementById('startQuestButton')!;
const titleImg = document.getElementById('title')!;
const gameButtonDiv = document.getElementById('gameButton')!;
const inputBoxDiv = document.getElementById('inputBox')!;
const narratorTextBox = document.getElementById('narratorText')!;

startButton.classList.remove('hidden');
titleImg.classList.remove('hidden');

interface CharacterDOM {
  idle: HTMLImageElement;
  talking: HTMLImageElement;
  bubble: HTMLImageElement;
  textBox: HTMLDivElement;
}

const characterDom = new Map<string, CharacterDOM>();

// Characters that have been introduced and should stay on screen (as idle
// sprites, without a speech bubble) even when someone else is talking.
const onStage = new Set<string>();

startButton.addEventListener('click', async () => {
  const game = parseGameScript();
  if (game.title) {
    document.title = game.title;
    mainHeader.querySelector('h1')!.textContent = game.title;
  }
  await preloadImages([...getCharacterAssets(game), SPEECH_BUBBLE_LEFT, SPEECH_BUBBLE_RIGHT]);
  buildCharacterDom(game);

  startButton.classList.add('hidden');
  mainHeader.classList.add('hidden');
  titleImg.classList.add('hidden');

  void runGame(game);
});

function buildCharacterDom(game: Game) {
  for (const c of Object.values(game.characters)) {
    const idle = makeImg(c.idle, ['character', c.side, 'hidden'], `char-${c.id}-idle`);
    const talking = makeImg(c.talking, ['character', c.side, 'hidden'], `char-${c.id}-talking`);
    const bubble = makeImg(
      c.side === 'left' ? SPEECH_BUBBLE_LEFT : SPEECH_BUBBLE_RIGHT,
      ['speech-bubble', c.side, 'hidden'],
      `bubble-${c.id}`
    );
    const textBox = document.createElement('div');
    textBox.id = `text-${c.id}`;
    textBox.classList.add('dialog-text', c.side, 'hidden');

    appContainer.append(idle, talking, bubble, textBox);
    characterDom.set(c.id, { idle, talking, bubble, textBox });
  }
}

function makeImg(src: string, classes: string[], id: string): HTMLImageElement {
  const img = document.createElement('img');
  img.src = src;
  img.id = id;
  img.classList.add(...classes);
  return img;
}

async function runGame(game: Game) {
  let current: Node | undefined = game.nodes[game.head];
  while (current && !isTerminal(current)) {
    await renderNode(current, game);
    const nextId = await waitForChoice(current);
    if (!nextId) break;
    clearTransient();
    current = game.nodes[nextId];
  }
  hideAll(game);
  renderGameEnd();
}

function isTerminal(node: Node): boolean {
  return node.options.length === 0 && !node.expectedInputContains;
}

async function renderNode(node: Node, game: Game) {
  if (node.changeBackground) {
    appContainer.style.backgroundImage = `url(${node.changeBackground})`;
  }

  // Keep everyone who's already been introduced on screen as an idle sprite.
  for (const id of onStage) {
    characterDom.get(id)?.idle.classList.remove('hidden');
  }

  for (let i = 0; i < node.lines.length; i++) {
    const line = node.lines[i];
    const isLast = i === node.lines.length - 1;
    await playLine(line, game);
    if (!isLast && line.text) await waitForClick();
  }
}

async function playLine(line: DialogLine, game: Game) {
  const id = line.speakerId;
  if (!id) return;

  // Narrator path
  if (id === game.narratorId && !game.characters[id]) {
    narratorTextBox.classList.remove('hidden');
    await typeText(line.text, narratorTextBox);
    return;
  }

  const dom = characterDom.get(id);
  if (!dom) return;

  // Sprite-only (no text): show idle and keep the character on stage.
  if (!line.text) {
    dom.idle.classList.remove('hidden');
    onStage.add(id);
    return;
  }

  // Hide every other character's talking sprite and bubble, but leave anyone
  // already on stage visible as an idle sprite.
  for (const [otherId, other] of characterDom) {
    if (otherId === id) continue;
    other.talking.classList.add('hidden');
    other.bubble.classList.add('hidden');
    other.textBox.classList.add('hidden');
    other.textBox.textContent = '';
    if (onStage.has(otherId)) other.idle.classList.remove('hidden');
  }

  dom.idle.classList.add('hidden');
  dom.talking.classList.remove('hidden');
  dom.bubble.classList.remove('hidden');
  dom.textBox.classList.remove('hidden');
  await typeText(line.text, dom.textBox);
  onStage.add(id);
}

function waitForChoice(node: Node): Promise<string> {
  if (node.options.length > 0) return waitForOption(node.options);
  if (node.expectedInputContains) {
    return waitForInput(node.expectedInputContains, node.inputNext!, node.wrongInputNext!);
  }
  return Promise.resolve('');
}

function waitForOption(options: Option[]): Promise<string> {
  return new Promise(resolve => {
    gameButtonDiv.innerHTML = '';
    for (const option of options) {
      const button = document.createElement('button');
      button.textContent = option.text;
      button.addEventListener('click', () => resolve(option.next));
      gameButtonDiv.appendChild(button);
    }
  });
}

function waitForInput(expected: string, okNext: string, badNext: string): Promise<string> {
  return new Promise(resolve => {
    inputBoxDiv.classList.remove('hidden');
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Answer here';
    inputBoxDiv.appendChild(input);
    input.focus();
    input.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      const ok = input.value.toLowerCase().includes(expected);
      input.remove();
      resolve(ok ? okNext : badNext);
    });
  });
}

// Clear between nodes: drop talking sprites, bubbles, text and controls, but
// keep on-stage characters present as idle sprites.
function clearTransient() {
  for (const [id, dom] of characterDom) {
    dom.talking.classList.add('hidden');
    dom.bubble.classList.add('hidden');
    dom.textBox.classList.add('hidden');
    dom.textBox.textContent = '';
    if (onStage.has(id)) dom.idle.classList.remove('hidden');
    else dom.idle.classList.add('hidden');
  }
  narratorTextBox.classList.add('hidden');
  narratorTextBox.textContent = '';
  gameButtonDiv.innerHTML = '';
  inputBoxDiv.innerHTML = '';
  inputBoxDiv.classList.add('hidden');
}

// Full reset, used when the game ends.
function hideAll(game: Game) {
  for (const dom of characterDom.values()) {
    dom.idle.classList.add('hidden');
    dom.talking.classList.add('hidden');
    dom.bubble.classList.add('hidden');
    dom.textBox.classList.add('hidden');
    dom.textBox.textContent = '';
  }
  onStage.clear();
  narratorTextBox.classList.add('hidden');
  narratorTextBox.textContent = '';
  gameButtonDiv.innerHTML = '';
  inputBoxDiv.innerHTML = '';
  inputBoxDiv.classList.add('hidden');
  void game;
}

function typeText(text: string, box: HTMLElement): Promise<void> {
  return new Promise(resolve => {
    box.textContent = '';
    let i = 0;
    const interval = setInterval(() => {
      box.textContent += text[i];
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        resolve();
      }
    }, 40);
  });
}

function waitForClick(): Promise<void> {
  return new Promise(resolve => {
    document.addEventListener('click', () => resolve(), { once: true });
  });
}

function renderGameEnd() {
  const endEl = document.createElement('div');
  endEl.className = 'game-end';
  endEl.textContent = 'THE END';
  appContainer.appendChild(endEl);
}

function preloadImages(urls: string[]): Promise<void> {
  const promises = urls.map(
    url =>
      new Promise<void>(resolve => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = url;
      })
  );
  return Promise.all(promises).then(() => undefined);
}
