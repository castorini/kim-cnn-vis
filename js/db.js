var db;

function indexedDBOk() {
  return "indexedDB" in window;
}

function initializeDB(openSuccessCallback) {
  if (!indexedDBOk) return;

  var openRequest = indexedDB.open("index", 8);

  openRequest.onupgradeneeded = function (e) {
    var thisDB = e.target.result;

    if (!thisDB.objectStoreNames.contains("wordvecs")) {
      thisDB.createObjectStore("wordvecs");
    }

    if (!thisDB.objectStoreNames.contains("wordvecslarge")) {
      thisDB.createObjectStore("wordvecslarge");
    }

    if (!thisDB.objectStoreNames.contains("kimcnn_parameters")) {
      thisDB.createObjectStore("kimcnn_parameters");
    }

    if (!thisDB.objectStoreNames.contains("dataset")) {
      thisDB.createObjectStore("dataset");
    }

    if (!thisDB.objectStoreNames.contains("nn_res")) {
      thisDB.createObjectStore("nn_res");
    }
  };

  openRequest.onsuccess = function (e) {
    db = e.target.result;
    openSuccessCallback();
  };

  openRequest.onerror = function (e) {
    console.log("Initialization error!");
  };
}
