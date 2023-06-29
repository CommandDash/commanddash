
export function getPebbleSearchPanelHtml() {
    return `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src 'self' http://localhost:3000; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <!-- <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';"> -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            background-color: #1e1e1e;
            color: #d4d4d4;
            padding: 16px;
        }

        input[type="search"] {
            width: 100%;
            padding: 8px;
            border: 1px solid #454545;
            border-radius: 4px;
            background-color: #252526;
            color: #d4d4d4;
        }

        #tabs {
            display: flex;
            margin: 8px 0;
        }

        button {
            flex: 1;
            padding: 8px;
            margin-right: 8px;
            background-color: #3c3c3c;
            border: none;
            border-radius: 4px;
            color: #d4d4d4;
            font-weight: bold;
            cursor: pointer;
        }

        button:last-child {
            margin-right: 0;
        }

        .resultBox {
            background-color: #2d2d2d;
            padding: 16px;
            border-radius: 4px;
            margin-bottom: 16px;
        }

        .resultBox > p {
            margin: 8px 0;
        }

        .resultBox > button {
            margin-right: 8px;
        }

        .resultBox > button:last-child {
            margin-right: 0;
        }

        .code-preview {
            max-height: 100px;
            overflow: hidden;
            white-space: pre-wrap;
            transition: max-height 0.4s ease;
            background: #1e1e1e;
            padding: 10px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            color:#d4d4d4;
            position:relative;
        }

        .code-preview.expanded {
            max-height: unset;
            overflow: auto;
        }

        .show-more {
            display: inline-block;
            text-align: center;
            padding: 4px 12px;
            padding: 8px;
            margin-right: 8px;
            background-color: #3c3c3c;
            border: none;
            border-radius: 4px;
            color: #d4d4d4;
            font-weight: bold;
            cursor: pointer;
        }

        .show-more:hover {
            color: #63a8ff;
        }
        .code-preview:before {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 30px;
        background-image: linear-gradient(rgba(30, 30, 30, 0), rgba(30, 30, 30, 1));
        opacity: 0;
        transition: opacity 0.4s ease;
        }

        .code-preview:not(.expanded):before {
        opacity: 1;
        }
    </style>
</head>
<body>
    <header>
        <span>
            <!-- welltested in bright green color -->
            <h1 style="color: rgb(134, 255, 134);"  >WelltestedAI</h1>
            <h1> Pebbles</h1>
        </span>
    </header>
    <input type="search" id="searchBar" onclick="displayResults()" placeholder="Search for code snippets">
    <div id="tabs">
        <button id="browseTab">Browse</button>
        <button id="favoritesTab">Favorites</button>
        <button id="mySnippetsTab">My Snippets</button>
    </div>
    <div id="searchResults"></div>
    <script>
        const searchResults = document.getElementById("searchResults");

      async  function displayResults() {
            console.log("called displayResults");
            searchResults.innerHTML = ""; // Clear any previous results
            console.log('called displayResults');
            searchResults.innerHTML = ''; // Clear any previous results
            const response = await fetch('http://localhost:3000/api/dummy-data');
            const results = await response.json();

            results.forEach((snippet) => {
                const resultBox = document.createElement("div");
                const codePreview = snippet.code.split('\n').slice(0, 5).join('\n');
                resultBox.classList.add("resultBox");
                resultBox.innerHTML =
            '<span><h3 style="display: inline;">' + snippet.title + '</h3> by: <span style="font-size: smaller;">' + snippet.publisher + '</span></span>'+
            // downloads and favorties with icons and numbers
            '<span style="float: right;">' +
            
            '<span style="font-size: big;"> 📋 ' + snippet.downloads + '</span>' +
            '</span>' +
           
            "<pre class='code-preview' id='code-preview-" + snippet.id + "'>" + codePreview + "</pre>" +
            "<p class='show-more' id='show-more-" + snippet.id + "'>Show more</p>" +
           
            "<p>Description: " + snippet.description + "</p>" +
            '<button  onclick="selectedCode('+snippet.id+',false)"   >Add to Code</button>' +
            '<button onclick="selectedCode('+snippet.id+',true)"   >Customize</button>' +
            '<button>❤️ 1456</button>'
            ;

                searchResults.appendChild(resultBox);
                document.getElementById('show-more-' + snippet.id).addEventListener('click',async function () {
                    const codePreviewElement = document.getElementById('code-preview-' + snippet.id);
                    await showCodeWithLoader(1,codePreviewElement);
                    codePreviewElement.classList.toggle("expanded");
                    this.innerText = codePreviewElement.classList.contains("expanded") ? "Show less" : "Show more";
                });
            });
        }
        </script>
        <script>
        const vscode = acquireVsCodeApi();
        // pass selected to vscode
        function selectedCode(code, customize) {
            console.log("selected code");

            const counter = document.getElementById('lines-of-code-counter');
            if (customize) {
                vscode.postMessage({
                    command: 'customize',
                    text: code,
                });
            } else {
                vscode.postMessage({
                    command: 'add',
                    text: code,
                });
            }
        }
        </script>
        <script>

        async function showCodeWithLoader(id, codePreviewElement) {
            // Display the loader
            const loader = '<div class="loader" style="display: inline-block;" id="loader-' + id + '">Loading...</div>';
            codePreviewElement.innerHTML = loader;
            
            // Fetch the complete code using the API
            const completeCode = await fetchCompleteCode(id);

            // Remove the loader and show the retrieved code
            codePreviewElement.innerHTML = completeCode;
        }
        async function fetchCompleteCode(id) {
            const response = await fetch('http://localhost:3000/api/getfull');
            const results = await response.text();
            return results
        }

    </script>
</body>
</html>
`;
}



export function getSavedPebblePanelHtml(code:string,description:string) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                background-color: #1e1e1e;
                color: #d4d4d4;
                padding: 16px;
            }
            
            h1 {
                font-size: 24px;
                margin-bottom: 16px;
            }
    
            form {
                display: grid;
                grid-template-columns: 1fr 2fr;
                grid-gap: 8px;
            }
    
            label {
                text-align: right;
                margin-right: 8px;
                align-self: center;
            }
    
            input, textarea {
                border: 1px solid #454545;
                border-radius: 4px;
                background-color: #252526;
                color: #d4d4d4;
                padding: 8px;
            }
    
            textarea {
                resize: vertical;
                min-height: 60px;
            }
    
            .privacy {
                display: flex;
                align-items: center;
            }
    
            .switch {
                position: relative;
                display: inline-block;
                width: 60px;
                height: 34px;
            }
    
            .switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
    
            .slider {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #ccc;
                transition: 0.4s;
                border-radius: 34px;
            }
    
            .slider:before {
                position: absolute;
                content: "";
                height: 26px;
                width: 26px;
                left: 4px;
                bottom: 4px;
                background-color: white;
                border-radius: 50%;
                transition: 0.4s;
            }
    
            input:checked + .slider {
                background-color: #3c3c3c;
            }
    
            input:checked + .slider:before {
                transform: translateX(26px);
            }
    
            button {
                grid-column: 2;
                justify-self: start;
                padding: 8px 16px;
                background-color: #3c3c3c;
                border: none;
                border-radius: 4px;
                color: #d4d4d4;
                font-weight: bold;
                cursor: pointer;
            }
            pre {
                background-color: #2d2d2d;
                border-radius: 4px;
                padding: 16px;
                overflow-x: auto;
            }
    
            code {
                font-family: 'Fira Code', Monaco, 'Courier New', Courier, monospace;
                color: #acd9c1;
            }
        </style>
    </head>
    <body>
        <h1>Pebble Details</h1>
        <form>
            <label for="snippetName">Name:</label>
            <input type="text" id="snippetName">
            <label for="snippetDescription">Description:</label>
            <textarea id="snippetDescription">${description}</textarea>
            <label for="privateSwitch">Private:</label>
            <div class="privacy">
                <label class="switch">
                    <input type="checkbox" id="privateSwitch">
                    <span class="slider"></span>
                </label>
            </div>
            <button type="submit">Save Snippet</button>
        </form>
        <h2>Pebble Preview</h2>
        <pre><code>${code}</code></pre>
        <script>
            // Send the selectedText to the extension when the form is submitted
            document.querySelector("form").addEventListener("submit", (e) => {
                e.preventDefault(); // Prevent the default form submission behavior
    
                const name = document.getElementById("snippetName").value;
                const description = document.getElementById("snippetDescription").value;
                const isPrivate = document.getElementById("privateSwitch").checked;
                
                // Send the snippet details to the main extension
                window.parent.postMessage(
                    { command: "saveSnippet", name: name, description: description, private: isPrivate },
                    "*"
                );
            });
        </script>
    </body>
    </html>`;

}



