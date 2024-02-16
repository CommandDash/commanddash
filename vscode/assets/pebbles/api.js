/* eslint-disable @typescript-eslint/naming-convention */
var API_URL = ""; 

window.addEventListener('message', handleMessage);

function handleMessage(event) {
  const data = event.data;
  console.log("message received", data);
  if(data.type === 'keys'){
    window.accessToken = data.keys.access_token;
    window.refreshToken = data.keys.refresh_token;
    window.openaikey = data.keys.openai_key;  
    window.projectName = data.keys.project_name;
    window.api = data.env;

    API_URL = window.api["HOST"];
  loadNextPage();

  }
}

setTimeout(() => {
  if(!window.api){
    vscode.postMessage({
      command: "getKeys",
      message: "User not authenticated. Please login.",
    });
  }
}, 500);


async function fetchWithToken(url, options = {}) {

  console.log("Making request to ", url, "with options", options);
  console.log("access token", window.accessToken);
  
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
  console.log("response", response);

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
browseButton.addEventListener("click", ()=>{
  currentPage = 1;
  const searchResults = document.getElementById("searchResults");
  searchResults.innerHTML="";
  loadNextPage();
});

async function loadNextPage() {
  const searchResults = document.getElementById("searchResults");
  const loaderDiv = document.createElement('div');
  loaderDiv.className = 'loader';
  searchResults.appendChild(loaderDiv);
  
  try {
    const results = await fetchPebbles(currentPage, perPage);
    loaderDiv.remove();
    results.forEach((pebble) => {
      const resultBox = document.createElement("div");
      const codePreview = pebble.preview;
      resultBox.classList.add("resultBox");
      resultBox.innerHTML = renderPebble(pebble);
       
      searchResults.appendChild(resultBox);
      document
        .getElementById("show-more-" + pebble.pk)
        .addEventListener("click", async function () {
          console.log("show more clicked");
          const codePreviewElement = document.getElementById(
            "code-preview-" + pebble.pk
          );
          codePreviewElement.classList.contains("expanded")
            ? ""
            : await showCodeWithLoader(pebble.pk, codePreviewElement);
          codePreviewElement.classList.toggle("expanded");
          this.style.transform = codePreviewElement.classList.contains("expanded")?
            "rotate(180deg)": "rotate(0deg)";
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
 
 

async function fetchPebbles(page = 1, per_page = 2) {
  const url = `${API_URL}${window.api["get_pebbles"]}?page=${page}&per_page=${per_page}`;
  const response = await fetchWithToken(url, {},);

  if (response.status === 200) {
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
  console.log("embeddings", embeddings);
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
  console.log(`adding to favorites ${pebble_id}`);
  const url = `${API_URL}${window.api["favorite_pebble"]}`;
  
  const options = {
    method: "POST",
    body: JSON.stringify({pebble_id: pebble_id, 
      search_query_pk: window.searchQueryPk,
    })
  };
  const response = await fetchWithToken(url,options);

  if (response.ok) {
    const result = await response.json();
    vscode.postMessage({
      command: "addToFavoritesSuccess",
      message: result.message,
    });
    // update the button and count
    const button = document.getElementById("favorite-"+pebble_id);
    button.innerText = "❤️ " + result.favorite_count;
    button.disabled = true;
    return result;
  } else {
    const error = await response.json();
    vscode.postMessage({
      command: "addToFavoritesError",
      message: result.message,
    });
    throw new Error(error.message);
  }
}


async function getFavorites(){
  const url = `${API_URL}${window.api["my_favorites"]}`;
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

// add listeners to favorites button
const favoritesButton = document.getElementById("favoritesTab");
favoritesButton.addEventListener("click", (e) => {
  addFavoritesToHtml();
});

async function addFavoritesToHtml(){
  const favoritesDiv = document.getElementById("favoritesTabContent");
  favoritesDiv.innerHTML = "";
  favoritesDiv.innerHTML = "<div class='loader'></div>";
  const favorites = await getFavorites();
  favoritesDiv.innerHTML = "";
  favorites.forEach((pebble) => {
    const resultBox = document.createElement("div");
    const codePreview = pebble.preview;
    resultBox.classList.add("resultBox");
    resultBox.innerHTML = renderPebble(pebble);
 
    favoritesDiv.appendChild(resultBox);
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
        this.style.transform = codePreviewElement.classList.contains("expanded")?
            "rotate(180deg)": "rotate(0deg)";
      });
  });
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
    resultBox.innerHTML =renderPebble(pebble);
    mySnippetsDiv.appendChild(resultBox);
    document
      .getElementById("show-more-" + pebble.pk)
      .addEventListener("click", async function () {
        const codePreviewElement = document.getElementById(
          "code-preview-" + pebble.pk
        );
       codePreviewElement.classList.toggle("expanded");
        if(codePreviewElement.classList.contains("expanded")){
          codePreviewElement.innerHTML = pebble.code;
        }
        else{
          codePreviewElement.innerHTML = codePreview;
        }
        this.style.transform = codePreviewElement.classList.contains("expanded")?
        "rotate(180deg)": "rotate(0deg)";
      });
  });

}

function renderPebble(pebble) {
  
  
  var headerPart = `
      <span>
      <h3 style="display: inline;">${pebble.pebble_name}</h3>
      <span style="float: right;">`;
headerPart +=pebble.usage_count===0?``: `
          <span style="font-size: big;"> 📋 ${pebble.usage_count}</span>`;
headerPart +=`
      </span>
      </span>`;

      const descriptionPart = `
      <br>
      <pre class='code-preview' id='code-preview-${pebble.pk}'>${pebble.preview}</pre>
      <p class='show-more' id='show-more-${pebble.pk}'>&#x25BC</p>
          <p>Description: ${pebble.description}</p>`;

  const linkStyle = 'style="background: none;font-weight: normal; border: none; padding: 10px; font-family: arial,  sans-serif; cursor: pointer; align: center;"';
  const customButtonAndAction = (buttonInnerHTML, isCustomizeButton=false) => `
      <button  onclick="selectedCode('${pebble.pk}', ${isCustomizeButton})">${buttonInnerHTML}</button>`;
  
  const favoriteButton = `
      <button class="favorite" id="favorite-${pebble.pk}" onclick="addToFavorites('${pebble.pk}')" ${(pebble.favorited ? "disabled" : "")}>
      ${(pebble.favorited ? '❤️' : '🤍')} ${pebble.favorite_count}
      </button>`;
  
  const publisherButton = pebble.publisher? `
      <button ${linkStyle} onclick="openGithub('${pebble.publisher}')" style="text-decoration: underline; float: right;">${pebble.publisher}</button>`:'';

  const buttonPart = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
      ${customButtonAndAction("Add to Code")}
      ${customButtonAndAction("Customize", true)}
      ${favoriteButton}
      ${publisherButton}
      </div>`;

  return `${headerPart}${descriptionPart}${buttonPart}`;
}
 



// Gemini create embeddings
async function createEmbeddings(text){
  const url = "https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key="+window.openaikey;
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "models/embedding-001",
      content: {
        parts: [{
          text: text
        }]
      }
    })
  };
  const response = await fetch(url,options);

  if (response.ok) {
    const result = await response.json();
    return result.embedding.values;
  }
  else {
    const error = await response.json();
    throw new Error(error.error.message);
  }
}

