var API_URL = ""; 

window.addEventListener('message', handleMessage);

function handleMessage(event) {
  const data = event.data;
  if(data.type === 'keys'){
    window.accessToken = data.keys.access_token;
    window.refreshToken = data.keys.refresh_token;
    window.openaikey = data.keys.openai_key;  
    window.projectName = data.keys.project_name;
    window.api = data.env;

    API_URL = window.api["HOST"];
  }
}


async function fetchWithToken(url, options = {}) {
  
  if ( !window.refreshToken) {
    vscode.postMessage({
      command: "auth",
      message: "User not authenticated. Please login.",
    });
    return;
  }
  if(!window.accessToken){
    console.log("access token not found, trying to refresh it");
    const newAccessToken = await refreshAccessToken(window.refreshToken);
  }

  options.headers = options.headers || new Headers();
  options.headers.set("Content-Type", "application/json");
  options.headers.set("Authorization", `Bearer ${window.accessToken}`);

  const response = await fetch(url, options);

  if (response.status === 401) {
    console.log("access token expired, trying to refresh it");
    // Access token expired, try to refresh it
    const newAccessToken = await refreshAccessToken(window.refreshToken);
    

    // Update the access token in the localStorage or sessionStorage and headers
    options.headers.set("Authorization", `Bearer ${newAccessToken}`);
    
    // Call the API again
    const newResponse = await fetch(url, options);
    return newResponse;
  }

  return response;
}

function saveAccessTokenVsCode(accessToken) {
  // send message to vscode to save the access token
  vscode.postMessage({
    command: "saveAccessToken",
    accessToken: accessToken,
  });
}


async function refreshAccessToken(refreshToken) {
  const response = await fetch(`${API_URL}${window.api["token_refresh"]}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${refreshToken}`,
    },
  });

  const results = await response.json();
  const newAccessToken = results.access_token;
  window.accessToken = newAccessToken;
  saveAccessTokenVsCode(newAccessToken);
  return newAccessToken;
 
}

let currentPage = 1;
const perPage = 2;

// add listener to browse button
const browseButton = document.getElementById("browseTab");
browseButton.addEventListener("click", loadNextPage);

async function loadNextPage() {
  const searchResults = document.getElementById("searchResults");
  const loaderDiv = document.createElement('div')
  loaderDiv.className = 'loader';
  searchResults.appendChild(loaderDiv);
  
  try {
    const results = await fetchPebbles(currentPage, perPage)
    loaderDiv.remove();
    results.forEach((pebble) => {
      const resultBox = document.createElement("div");
      const codePreview = pebble.preview;
      resultBox.classList.add("resultBox");
      resultBox.innerHTML =
        '<span><h3 style="display: inline;">' +
        pebble.pebble_name +
        '</h3> by: <span style="font-size: smaller;">' +
        pebble.publisher +
        "</span></span>" +
        // downloads and favorties with icons and numbers
        '<span style="float: right;">' +
        '<span style="font-size: big;"> 📋 ' +
        pebble.downloads +
        "</span>" +
        "</span>" +
        "<br>" +
        pebble.pk +
        "<br>"+
        "<pre class='code-preview' id='code-preview-" +
        pebble.pk +
        "'>" +
        codePreview +
        "</pre>" +
        "<p class='show-more' id='show-more-" +
        pebble.pk +
        "'>Show more</p>" +
        "<p>Description: " +
        pebble.description +
        "</p>" +
        `<button onclick="selectedCode('${pebble.pk}', false)">Add to Code</button>` +
        `<button onclick="selectedCode('${pebble.pk}', true)">Customize</button>` +
        // '<button  onclick="selectedCode(' +
        // pebble.pk +
        // ',false)"   >Add to Code</button>' +
        // '<button onclick="selectedCode(' +
        // pebble.pk +
        // ',true)"   >Customize</button>' +
        `<button onclick="addToFavorites('${pebble.pk}')"" >❤️ 1456</button>`;
      searchResults.appendChild(resultBox);
      document
        .getElementById("show-more-" + pebble.pk)
        .addEventListener("click", async function () {
          const codePreviewElement = document.getElementById(
            "code-preview-" + pebble.pk
          );
          codePreviewElement.classList.contains("expanded")
            ? ""
            : await showCodeWithLoader(pebble.pk, codePreviewElement);
          codePreviewElement.classList.toggle("expanded");
          this.innerText = codePreviewElement.classList.contains("expanded")
            ? "Show less"
            : "Show more";
        });
    });
    // increment page
    currentPage++;
    // add a element to load more

    const loadMoreButton = document.createElement("button");
    loadMoreButton.innerText = "Load more";
    loadMoreButton.addEventListener("click", loadNextPage);

  } catch(error) {
    console.error('Failed to load data', error);

    loaderDiv.remove();

    const errorDiv = document.createElement('div');
    errorDiv.textContent = 'Error loading data.';
    searchResults.appendChild(errorDiv);
  }
}
 

function buildSearchResults(results) {
  return results.map(res => `
    <div class="resultBox">
      <span>
        <h3 style="display: inline;">${res.pebble_name}</h3> by: <span style="font-size: smaller;">${res.publisher}</span>
      </span>
      <span style="float: right;">
        <span style="font-size: big;"> 📋 ${res.downloads}</span>
      </span>
      <pre class="code-preview" id="code-preview-${res.pk}">${res.preview}</pre>
      <p class="show-more" id="show-more-${res.pk}">Show more</p>
      <p>Description: ${res.description}</p>
      <button onclick="selectedCode('${res.pk}', false)">Add to Code</button>
      <button onclick="selectedCode('${res.pk}', true)">Customize</button>
    </div>
  `).join('');
}

async function fetchPebbles(page = 1, per_page = 2) {
  const url = `${API_URL}${window.api["get_pebbles"]}?page=${page}&per_page=${per_page}`;
  const response = await fetchWithToken(url, {},);

  if (response.ok) {
    const results = await response.json();
    return results.data;
  } else {
    const error = await response.json();
    throw new Error(error.message);
  }
} 

async function fetchPebbleFullCode(pk) {
  const url = `${API_URL}${window.api["get_code"]}?pk=${pk}`;
  const response = await fetchWithToken(url,{},);

  if (response.ok) {
    const result = await response.text();
    return result;
  } else {
    const error = await response.json();
    throw new Error(error.message);
  }
}

async function addPebbleRequest(data) {
  const url = `${API_URL}${window.api["new_pebble"]}`;
  const embeddings = await createEmbeddings(data.code);
  data.embeddings = embeddings;

  const options = {
    method: "POST",
   
    body: JSON.stringify(data)
  };
  
  const response = await fetchWithToken(url,options);

  if (response.ok) {
    const result = await response.json();
    return result;
  } else {
    const error = await response.json();
    throw new Error(error.message);
  }
}

// bind to searchBar on submit
const searchBar = document.getElementById("searchBar");
searchBar.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = document.getElementById("searchInput").value;
  searchTopPebbles(query);
});



async function searchTopPebbles(query){
  const url = `${API_URL}${window.api["search_pebbles"]}`;
  const options = {
    method: "POST",
    body: JSON.stringify({
      query: query,
      project_name: window.projectName,
    })
  };
  const response = await fetchWithToken(url,options,);

  if (response.ok) {
    const result = await response.json();
    window.searchQueryPk = result.search_query_pk;
    return result.data;
  } else {
    const error = await response.json();
    throw new Error(error.message);
  }
}

async function addToFavorites(pebble_id){
  const url = `${API_URL}${window.api["favorite_pebble"]}`;
  const searchQuery = document.getElementById("searchBar").value;
  const options = {
    method: "POST",
    body: JSON.stringify({pebble_id: pebble_id, query: searchQuery})
  };
  const response = await fetchWithToken(url,options);

  if (response.ok) {
    const result = await response.json();
    vscode.postMessage({
      command: "addToFavoritesSuccess",
      message: result.message,
    });
    return result.data;
  } else {
    const error = await response.json();
    vscode.postMessage({
      command: "addToFavoritesError",
      message: result.message,
    });
    throw new Error(error.message);
  }
}

// get my snippets
async function getMySnippets(){
  const url = `${API_URL}${window.api["my_pebbles"]}`;
  const options = {
    method: "GET",
  };
  const response = await fetchWithToken(url,options);

  if (response.ok) {
    const result = await response.json();
    return result;
  } else {
    const error = await response.json();
    throw new Error(error.message);
  }
}

// add listeners to my snippets button
const mySnippetsButton = document.getElementById("mySnippetsTab");
mySnippetsButton.addEventListener("click", (e) => {
  addMySnippetsToHtml();
});


async function addMySnippetsToHtml(){
 
  const mySnippetsDiv = document.getElementById("mySnippetsTabContent");
  mySnippetsDiv.innerHTML = "";
  mySnippetsDiv.innerHTML = "<div class='loader'></div>";
  const mySnippets = await getMySnippets();
  mySnippetsDiv.innerHTML = "";
 
  mySnippets.forEach((pebble) => {
    const resultBox = document.createElement("div");
    const codePreview = pebble.preview;
    resultBox.classList.add("resultBox");
    resultBox.innerHTML =
      '<span><h3 style="display: inline;">' +
      pebble.pebble_name +
      '</h3> by: <span style="font-size: smaller;">' +
      pebble.publisher +
      "</span></span>" +
      // downloads and favorties with icons and numbers
      '<span style="float: right;">' +
      '<span style="font-size: big;"> 📋 ' +
      pebble.usage_count +
      "</span>" +
      "</span>" + 
      "<pre class='code-preview' id='code-preview-" +
      pebble.pk +
      "'>" +
      codePreview +
      "</pre>" +
      "<p class='show-more' id='show-more-" +
      pebble.pk +
      "'>Show more</p>" +
      "<p>Description: " +
      pebble.description +
      "</p>" +
      `<button onclick="selectedCode('${pebble.pk}', false)">Add to Code</button>` +
      `<button onclick="selectedCode('${pebble.pk}', true)">Customize</button>` +
      // '<button  onclick="selectedCode(' +
      // pebble.pk +
      // ',false)"   >Add to Code</button>' +
      // '<button onclick="selectedCode(' +
      // pebble.pk +
      // ',true)"   >Customize</button>' +
     
    mySnippetsDiv.appendChild(resultBox);
    document
      .getElementById("show-more-" + pebble.pk)
      .addEventListener("click", async function () {
        const codePreviewElement = document.getElementById(
          "code-preview-" + pebble.pk
        );
        // codePreviewElement.classList.contains("expanded")
        //   ? ""
        //   : await showCodeWithLoader(pebble.pk, codePreviewElement);
        codePreviewElement.classList.toggle("expanded");
        if(codePreviewElement.classList.contains("expanded")){
          codePreviewElement.innerHTML = pebble.code;
        }
        else{
          codePreviewElement.innerHTML = codePreview;
        }
        this.innerText = codePreviewElement.classList.contains("expanded")
          ? "Show less"
          : "Show more";
      });
  });

}






// openAI create embeddings
async function createEmbeddings(text){
  const url = "https://api.openai.com/v1/embeddings";
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${window.openaikey}`,
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-ada-002'
    })
  };
  const response = await fetch(url,options);

  if (response.ok) {
    const result = await response.json();
    return result.data[0].embedding;
  }
  else {
    const error = await response.json();
    throw new Error(error.message);
  }
}

