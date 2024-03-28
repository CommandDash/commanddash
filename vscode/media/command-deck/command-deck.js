
const properties = [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',

    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderStyle',

    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',

    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',

    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',

    'letterSpacing',
    'wordSpacing',

    'tabSize',
    'MozTabSize',
];

function getCaretCoordinates(element, position) {
    const div = document.createElement('div');
    document.body.appendChild(div);

    const style = div.style;
    const computed = getComputedStyle(element);

    style.whiteSpace = 'pre-wrap';
    style.wordBreak = 'break-word';
    style.position = 'absolute';
    style.visibility = 'hidden';
    style.overflow = 'hidden';

    properties.forEach(prop => {
        style[prop] = computed[prop];
    });

    div.textContent = element.textContent.substring(0, position);

    const span = document.createElement('span');
    span.textContent = element.textContent.substring(position) || '.';
    div.appendChild(span);

    const coordinates = {
        top: span.offsetTop + parseInt(computed['borderTopWidth']),
        left: span.offsetLeft + parseInt(computed['borderLeftWidth']),
        // height: parseInt(computed['lineHeight'])
        height: span.offsetHeight
    };

    div.remove();

    return coordinates;
}

class CommandDeck {
    constructor(ref, menuRef, resolveFn, replaceFn, menuItemFn, json, agentUIBuilder) {
        this.ref = ref;
        this.menuRef = menuRef;
        this.resolveFn = resolveFn;
        this.replaceFn = replaceFn;
        this.menuItemFn = menuItemFn;
        this.options = [];
        this.json = json;
        this.agentUIBuilder = agentUIBuilder;

        this.makeOptions = this.makeOptions.bind(this);
        this.closeMenu = this.closeMenu.bind(this);
        this.selectItem = this.selectItem.bind(this);
        this.onInput = this.onInput.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.renderMenu = this.renderMenu.bind(this);
        this.agentProvider = new AgentProvider(this.json);

        this.ref.addEventListener('input', this.onInput);
        this.ref.addEventListener('keydown', this.onKeyDown);
    }

    async makeOptions(query) {
        let options = [];
        if (query.startsWith('@')) {
            options = await this.resolveFn(query, 'at');
        } else if (query.startsWith('/')) {
            options = await this.resolveFn(query, 'slash');
        }
        if (options.length !== 0) {
            this.options = options;
            this.renderMenu();
        } else {
            this.closeMenu();
        }
    }

    closeMenu() {
        setTimeout(() => {
            this.options = [];
            this.left = undefined;
            this.top = undefined;
            this.triggerIdx = undefined;
            this.renderMenu();
        }, 0);
    }

    selectItem(active) {
        return () => {
            debugger;
            const option = this.options[active];
            if (!option.startsWith('/')) {
                this.ref.textContent = '';
            }
            if (option.startsWith('/')) {
                const textContent = this.ref.innerHTML;
                const atIndex = textContent.lastIndexOf('/');
                this.ref.innerHTML = textContent.substring(0, atIndex) + textContent.substring(atIndex + 1);
            }
            if (option.startsWith('@')) {
                const agentSpan = document.createElement('span');
                agentSpan.classList.add("inline-block", "text-[#287CEB]");
                agentSpan.contentEditable = false;
                agentSpan.textContent = `${option}\u200B`;
                this.ref.appendChild(agentSpan);
                const name = option;
                const item = this.json.find(item => item.name === name);
                if (item && item.supported_commands) {
                    this.options = item.supported_commands.map(command => command.slug);
                    this.renderMenu();
                } else {
                    this.options = [];
                    this.closeMenu();
                }
            } else {
                const agentUIBuilder = new AgentUIBuilder(this.ref);
                agentInputsJson = this.agentProvider.getInputs(option);
                agentUIBuilder.buildAgentUI(agentInputsJson);

                this.ref.focus();
                this.closeMenu();

                setTimeout(() => {
                    adjustHeight();
                    commandEnable = true;
                }, 0);
            }
        };
    }

    extractCommands(text, keyword) {
        const regex = new RegExp(`\\${keyword}\\s*(\\w+)`, 'g');
        const matches = text.match(regex);
        if (!matches) {
            return null;
        };
        return matches.map(match => {
            const [, word] = match.split(keyword);
            return word;
        });
    }

    onInput(ev) {
        const positionIndex = this.ref.selectionStart;
        const textBeforeCaret = this.ref.textContent.slice(0, positionIndex);
        const tokens = textBeforeCaret.split(/\s/);
        const lastToken = tokens[tokens.length - 1];
        const triggerIdx = textBeforeCaret.endsWith(lastToken)
            ? textBeforeCaret.length - lastToken.length
            : -1;
        const maybeTrigger = textBeforeCaret[triggerIdx];
        const keystrokeTriggered = maybeTrigger === '@' || maybeTrigger === '/';

        this.ref.style.height = "auto";
        this.ref.style.height = this.ref.scrollHeight + "px";

        const isTriggerAtStartOfWord = triggerIdx === 0;

        if (!keystrokeTriggered || !isTriggerAtStartOfWord) {
            this.closeMenu();
            return;
        }

        const query = textBeforeCaret.slice(triggerIdx);
        this.makeOptions(query);

        const coords = getCaretCoordinates(this.ref, positionIndex);
        const { top, left } = this.ref.getBoundingClientRect();

        const savedCaretPosition = positionIndex;

        setTimeout(() => {
            this.active = 0;
            this.left = window.scrollX + coords.left + left + this.ref.scrollLeft;
            this.top = window.scrollY + coords.top + top + coords.height - this.ref.scrollTop;
            this.triggerIdx = triggerIdx;

            this.renderMenu();

            this.ref.selectionStart = this.ref.selectionEnd = savedCaretPosition;
        }, 0);
    }

    onKeyDown(ev) {
        let keyCaught = false;
        if (this.triggerIdx !== undefined) {
            switch (ev.key) {
                case 'ArrowDown':
                    this.active = Math.min(this.active + 1, this.options.length - 1);
                    this.renderMenu();
                    keyCaught = true;
                    break;
                case 'ArrowUp':
                    this.active = Math.max(this.active - 1, 0);
                    this.renderMenu();
                    keyCaught = true;
                    break;
                case 'Enter':
                case 'Tab':
                    this.selectItem(this.active)();
                    keyCaught = true;
                    break;
                case 'Backspace':
                    const selection = window.getSelection();
                    const range = selection.getRangeAt(0);
                    const mentionNode = document.getElementById("special-commands");

                    if (mentionNode) {
                        const prevNode = mentionNode.previousSibling;
                        const nextNode = mentionNode.nextSibling;
                        this.ref.removeChild(mentionNode);

                        // Restore the cursor position 
                        range.setStartAfter(prevNode || nextNode);
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                    break;
            }
        }

        if (keyCaught) {
            ev.preventDefault();
        }
    }

    renderMenu() {
        if (this.top === undefined) {
            this.menuRef.hidden = true;
            return;
        }

        const caretHeight = this.ref.offsetHeight;
        this.menuRef.style.left = this.left + 'px';
        this.menuRef.style.top = (this.top - this.menuRef.offsetHeight - caretHeight) + 'px';
        this.menuRef.innerHTML = '';
        this.menuRef.classList.add("p-1");

        this.options.forEach((option, idx) => {
            const trigger = this.ref.textContent[this.triggerIdx];
            this.menuRef.appendChild(this.menuItemFn(
                option,
                this.selectItem(idx),
                this.active === idx,
                trigger));
        });

        this.menuRef.hidden = false;
    }
}