class AgentUIBuilder {
    constructor(ref) {
        this.ref = ref;

        this.onStringInput = this.onStringInput.bind(this);
        this.buildAgentUI = this.buildAgentUI.bind(this);

        this.container = document.createElement("div");

        this.codeInputIds = [];
    }

    buildAgentUI() {
        const { text_field_layout, registered_inputs, slug } = agentInputsJson[0];
        let textHtml = text_field_layout;
        registered_inputs.forEach(input => {
            const inputElement = this.createInputElement(input);
            this.container.appendChild(inputElement);
            textHtml = textHtml.replace(`<${input.id}>`, inputElement.outerHTML);
        });

        this.container.innerHTML = `<span class="inline-block text-pink-500" contenteditable="false">${slug}&nbsp;</span>${textHtml}`;
        this.ref.appendChild(this.container);
        this.registerCodeInputListener();
    }

    createInputElement(input) {
        const { id, display_text, type, optional } = input;
        const _optional = optional ? "(O)" : "";
        if (type === "string_input") {
            const inputContainer = document.createElement("span");
            const inputSpan = document.createElement("span");
            inputContainer.innerHTML = `<span contenteditable="false" class="bg-black text-white px-[7px] border border-black rounded-tl-[4px] rounded-bl-[4px] inline-block">${_optional} ${display_text}</span>`;
            inputContainer.classList.add("inline-block");

            inputSpan.id = id;
            inputSpan.contentEditable = true;
            inputSpan.tabIndex = 0;
            inputSpan.classList.add("px-2", "inline-block", "rounded-tr-[4px]", "rounded-br-[4px]", "string_input", id, "mb-1", "ml-[1px]", "mr-[1px]");
            inputSpan.textContent = '\u200B';

            this.ref.addEventListener('input', (event) => this.onStringInput(event, id));
            this.ref.addEventListener('paste', () => this.onTextPaste(id));

            inputContainer.appendChild(inputSpan);

            requestAnimationFrame(() => {
                if (!optional) {
                    const input = document.getElementById(id);
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.selectNodeContents(input);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            });

            return inputContainer;
        }

        if (type === "code_input") {
            const codeContainer = document.createElement("span");
            const codePlaceholder = document.createElement("span");

            codeContainer.classList.add("code-input-container");

            codePlaceholder.id = id;
            codePlaceholder.contentEditable = "false";
            codePlaceholder.tabIndex = 0;
            codePlaceholder.classList.add("ml-1", "mb-1", "px-[7px]", "inline-flex", "cursor-pointer", "rounded-[4px]", "mt-1", "code_input", "items-center");
            codePlaceholder.textContent = `${_optional} ${display_text}`;
            codeContainer.id = "code-container";
            codeContainer.appendChild(codePlaceholder);
            this.codeInputIds.push(id);

            // this.ref.addEventListener("click", this.onCodeInputClick);

            return codeContainer;
        }
    }

    registerCodeInputListener() {
        this.codeInputIds.forEach((_codeInputId) => {
            const codeInput = document.getElementById(_codeInputId);
            codeInput.addEventListener("focus", () => {
                codeInputId = _codeInputId;
            });
        });
    }

    onTextPaste(id) {
        const inputSpan = document.getElementById(id);
        inputSpan.dispatchEvent(new Event('input', { bubbles: true }));
    }

    onStringInput(event, id) {
        const sel = window.getSelection();
        const inputSpan = document.getElementById(id);
        if (event.target === inputSpan || (sel.anchorNode && sel.anchorNode.parentNode && sel.anchorNode.parentNode.classList.contains(id))) {
            const inputIndex = agentInputsJson[0].registered_inputs.findIndex(_input => _input.id === id);
            if (inputIndex !== -1) {
                agentInputsJson[0].registered_inputs[inputIndex].value = inputSpan.textContent.trim();
            }
        }
    }

    onCodeInput(chipsData, chipName) {
        const firstCodeInput = agentInputsJson[0].registered_inputs.find(input => input.type === "code_input" && ( codeInputId === 0 ? input.value === undefined : input.id === codeInputId));

        if (firstCodeInput) {
            const codeInputSpan = document.getElementById(firstCodeInput.id);
            firstCodeInput.value = JSON.stringify(chipsData);
            codeInputSpan.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">${dartIcon}</svg><span class="ml-1" id="${firstCodeInput.id}">${chipName}</span>`;
            codeInputId = 0;
        }
    }
}