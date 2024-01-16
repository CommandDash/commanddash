(function () {
    const vscode = acquireVsCodeApi();

    function openChatView() {
        console.log('checking');

        vscode.postMessage({
            type: "chatWebView"
        });
    }

    const sendButton = document.getElementById("send-chat");
    sendButton.onclick = openChatView;
})();
