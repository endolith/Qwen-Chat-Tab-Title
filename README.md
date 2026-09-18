# Qwen Chat - Prepend Chat Title to Tab Title

This is a Tampermonkey/Violentmonkey script that prepends the active conversation title to the browser tab title on chat.qwen.ai and chat.qwenlm.ai, making it easier to identify which conversation you're viewing when you have multiple tabs open.

---

## Features

- **Dynamic Tab Titles**: Automatically extracts the active chat title from the sidebar and prepends it to the browser tab title (e.g., "Chat Title - Qwen Studio")
- **SPA Navigation Support**: Updates tab title when navigating between conversations without page reloads
- **Title Caching**: Caches chat titles by conversation ID to maintain tab titles even when the sidebar element is temporarily unavailable
- **Mutation Observers**: Uses MutationObserver to detect DOM changes and update titles in real-time
- **Debounced Updates**: Prevents excessive title updates during rapid DOM changes
- **Polling Fallback**: Includes periodic polling as a safety net to ensure titles stay synchronized
- **Multi-domain Support**: Works on both `chat.qwen.ai` and `chat.qwenlm.ai`

---

## Installation

1. Ensure you have a userscript manager installed (like [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)).
2. Copy the contents of `qwen-chat-tab-title.user.js` into a new script in your userscript manager.
3. Save the script and refresh your Qwen chat page.

---

## Usage

1. Open the Qwen chat page (`https://chat.qwen.ai/` or `https://chat.qwenlm.ai/`).
2. Navigate to any conversation in the sidebar.
3. The browser tab title will automatically update to show the conversation title followed by " - Qwen Studio".
4. When switching between conversations, the tab title updates accordingly.

---

## How It Works

The script uses multiple strategies to extract the chat title:

1. **Active Sidebar Selectors**: Looks for elements with `.chat-item-drag-active` class containing `.chat-item-title-text`
2. **URL-based Extraction**: Extracts the chat ID from the URL and finds matching sidebar elements
3. **Fallback Container Inspection**: Clones the active container and strips out menu buttons and icons to extract clean text

The script also intercepts SPA history navigation (pushState, replaceState, popstate) to update titles during client-side routing.

---

## Configuration

The script includes configurable options at the top of the file:

- `defaultBaseTitle`: Fallback base title if none is detected (default: "Qwen Studio")
- `separator`: Separator between chat title and base title (default: " - ")
- `debounceMs`: Debounce delay for DOM updates (default: 50ms)
- `pollIntervalMs`: Polling interval as fallback (default: 1500ms)

---

## Feedback and Contributions

If you encounter issues or have suggestions for improvements, please submit an Issue or Pull Request.

---

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).
