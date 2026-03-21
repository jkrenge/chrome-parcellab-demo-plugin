import type { ChatbotConfig, ChatbotResponse, ChatMessage } from '../shared/types';

const WIDGET_HOST_ID = 'pl-demo-chatbot-host';

let currentConfig: ChatbotConfig | null = null;
let threadId: string | null = null;
let messages: ChatMessage[] = [];
let isLoading = false;
let errorMessage = '';
let isOpen = false;
let shadowRoot: ShadowRoot | null = null;

export function injectChatbot(config: ChatbotConfig): void {
  currentConfig = config;

  if (document.getElementById(WIDGET_HOST_ID)) {
    return;
  }

  const host = document.createElement('div');
  host.id = WIDGET_HOST_ID;
  host.style.position = 'fixed';
  host.style.bottom = '0';
  host.style.right = '0';
  host.style.zIndex = '2147483647';
  host.style.pointerEvents = 'none';
  document.documentElement.appendChild(host);

  shadowRoot = host.attachShadow({ mode: 'open' });
  render();
}

export function removeChatbot(): void {
  const host = document.getElementById(WIDGET_HOST_ID);
  if (host) {
    host.remove();
  }

  currentConfig = null;
  threadId = null;
  messages = [];
  isLoading = false;
  errorMessage = '';
  isOpen = false;
  shadowRoot = null;
}

function render(): void {
  if (!shadowRoot) return;

  shadowRoot.innerHTML = '';

  const style = document.createElement('style');
  style.textContent = getStyles();
  shadowRoot.appendChild(style);

  const container = document.createElement('div');
  container.className = 'chatbot-container';

  if (isOpen) {
    container.appendChild(buildChatWindow());
  }

  container.appendChild(buildLauncher());
  shadowRoot.appendChild(container);
}

function buildLauncher(): HTMLElement {
  const btn = document.createElement('button');
  btn.className = 'launcher';
  btn.title = 'parcelLab Chatbot';
  btn.innerHTML = isOpen ? closeSvg() : chatSvg();
  btn.addEventListener('click', () => {
    isOpen = !isOpen;
    render();
    if (isOpen) {
      requestAnimationFrame(() => focusInput());
    }
  });
  return btn;
}

function buildChatWindow(): HTMLElement {
  const win = document.createElement('div');
  win.className = 'chat-window';

  // Header
  const header = document.createElement('div');
  header.className = 'chat-header';

  const title = document.createElement('span');
  title.className = 'chat-title';
  title.textContent = 'parcelLab Agent';
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.title = 'Close';
  closeBtn.innerHTML = closeSvg();
  closeBtn.addEventListener('click', () => {
    isOpen = false;
    render();
  });
  header.appendChild(closeBtn);
  win.appendChild(header);

  // Messages
  const messageList = document.createElement('div');
  messageList.className = 'message-list';

  if (messages.length === 0 && !isLoading && !errorMessage) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';

    const greeting = document.createElement('p');
    greeting.className = 'empty-greeting';
    greeting.textContent = 'How can I help you today?';
    empty.appendChild(greeting);

    const suggestions = document.createElement('div');
    suggestions.className = 'suggestions';

    const prompts = [
      'Where is my order?',
      'I want to return an item',
      'My package is damaged'
    ];

    for (const prompt of prompts) {
      const chip = document.createElement('button');
      chip.className = 'suggestion-chip';
      chip.textContent = prompt;
      chip.addEventListener('click', () => {
        void sendMessage(prompt);
      });
      suggestions.appendChild(chip);
    }

    empty.appendChild(suggestions);
    messageList.appendChild(empty);
  }

  for (const msg of messages) {
    const bubble = document.createElement('div');
    bubble.className = `message ${msg.role}`;
    bubble.textContent = msg.content;
    messageList.appendChild(bubble);
  }

  if (isLoading) {
    const loader = document.createElement('div');
    loader.className = 'message assistant loading';
    loader.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    messageList.appendChild(loader);
  }

  if (errorMessage) {
    const err = document.createElement('div');
    err.className = 'error-banner';
    err.textContent = errorMessage;

    const dismiss = document.createElement('button');
    dismiss.className = 'error-dismiss';
    dismiss.textContent = 'Dismiss';
    dismiss.addEventListener('click', () => {
      errorMessage = '';
      render();
    });
    err.appendChild(dismiss);
    messageList.appendChild(err);
  }

  win.appendChild(messageList);

  // Scroll to bottom after render
  requestAnimationFrame(() => {
    messageList.scrollTop = messageList.scrollHeight;
  });

  // Input area
  const inputArea = document.createElement('div');
  inputArea.className = 'input-area';

  const input = document.createElement('input');
  input.className = 'chat-input';
  input.type = 'text';
  input.placeholder = 'Type a message…';
  input.disabled = isLoading;
  input.dataset.chatInput = 'true';

  const submitBtn = document.createElement('button');
  submitBtn.className = 'submit-btn';
  submitBtn.disabled = isLoading;
  submitBtn.innerHTML = sendSvg();

  const handleSubmit = () => {
    const query = input.value.trim();
    if (!query || isLoading) return;
    void sendMessage(query);
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  });

  submitBtn.addEventListener('click', handleSubmit);

  inputArea.appendChild(input);
  inputArea.appendChild(submitBtn);
  win.appendChild(inputArea);

  return win;
}

async function sendMessage(query: string): Promise<void> {
  if (!currentConfig) return;

  messages.push({
    id: crypto.randomUUID(),
    role: 'user',
    content: query,
    timestamp: new Date().toISOString()
  });

  isLoading = true;
  errorMessage = '';
  render();

  try {
    const response = (await chrome.runtime.sendMessage({
      type: 'CHATBOT_EXECUTE',
      query,
      config: currentConfig,
      threadId: threadId ?? undefined
    })) as ChatbotResponse;

    if (response?.ok) {
      threadId = response.threadId;
      messages = response.messages;
    } else {
      errorMessage = response?.error ?? 'An unknown error occurred.';
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Failed to send message.';
  } finally {
    isLoading = false;
    render();
    requestAnimationFrame(() => focusInput());
  }
}

function focusInput(): void {
  if (!shadowRoot) return;
  const input = shadowRoot.querySelector('[data-chat-input]') as HTMLInputElement | null;
  input?.focus();
}

function chatSvg(): string {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
}

function closeSvg(): string {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
}

function sendSvg(): string {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
}

function getStyles(): string {
  return `
    :host {
      all: initial;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1e293b;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .chatbot-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 12px;
      pointer-events: auto;
      z-index: 2147483647;
    }

    .launcher {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: none;
      background: #3D3AD3;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(61, 58, 211, 0.35), 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
    }

    .launcher:hover {
      background: #3230b8;
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(61, 58, 211, 0.45), 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .launcher:active {
      transform: scale(0.97);
    }

    .chat-window {
      width: 380px;
      max-height: 520px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }

    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      background: #3D3AD3;
      color: white;
      flex-shrink: 0;
    }

    .chat-title {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .close-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: none;
      background: rgba(255, 255, 255, 0.15);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .message-list {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 280px;
      max-height: 380px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      height: 100%;
      min-height: 200px;
      color: #94a3b8;
      font-size: 13px;
    }

    .empty-greeting {
      font-size: 15px;
      font-weight: 500;
      color: #64748b;
    }

    .suggestions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      max-width: 260px;
    }

    .suggestion-chip {
      display: block;
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: white;
      color: #334155;
      font-size: 13px;
      font-family: inherit;
      line-height: 1.4;
      text-align: left;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease;
    }

    .suggestion-chip:hover {
      border-color: #3D3AD3;
      background: #f5f5ff;
      color: #3D3AD3;
    }

    .suggestion-chip:active {
      background: #eeeeff;
    }

    .message {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 13px;
      line-height: 1.5;
      word-wrap: break-word;
      white-space: pre-wrap;
    }

    .message.user {
      align-self: flex-end;
      background: #3D3AD3;
      color: white;
      border-bottom-right-radius: 4px;
    }

    .message.assistant {
      align-self: flex-start;
      background: #f1f5f9;
      color: #1e293b;
      border-bottom-left-radius: 4px;
    }

    .message.loading {
      display: flex;
      gap: 4px;
      padding: 12px 18px;
    }

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #94a3b8;
      animation: bounce 1.2s infinite ease-in-out;
    }

    .dot:nth-child(2) { animation-delay: 0.15s; }
    .dot:nth-child(3) { animation-delay: 0.3s; }

    @keyframes bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }

    .error-banner {
      background: #fef2f2;
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 10px;
      padding: 10px 14px;
      color: #991b1b;
      font-size: 12px;
      line-height: 1.4;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .error-dismiss {
      align-self: flex-end;
      border: none;
      background: none;
      color: #dc2626;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      transition: background 0.15s;
    }

    .error-dismiss:hover {
      background: rgba(239, 68, 68, 0.1);
    }

    .input-area {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      border-top: 1px solid #e2e8f0;
      background: #fafbfc;
      flex-shrink: 0;
    }

    .chat-input {
      flex: 1;
      height: 38px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 0 12px;
      font-size: 13px;
      font-family: inherit;
      color: #1e293b;
      background: white;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .chat-input:focus {
      border-color: #3D3AD3;
      box-shadow: 0 0 0 2px rgba(61, 58, 211, 0.15);
    }

    .chat-input:disabled {
      background: #f1f5f9;
      color: #94a3b8;
    }

    .chat-input::placeholder {
      color: #94a3b8;
    }

    .submit-btn {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      border: none;
      background: #3D3AD3;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s ease;
    }

    .submit-btn:hover {
      background: #3230b8;
    }

    .submit-btn:disabled {
      background: #cbd5e1;
      cursor: default;
    }
  `;
}
