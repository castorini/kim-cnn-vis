var sep = "+";
var db;

function indexedDBOk() {
  return "indexedDB" in window;
}

function initializeDB() {
  if (!indexedDBOk) return;

  var openRequest = indexedDB.open("index", 3);

  openRequest.onupgradeneeded = function (e) {
    var thisDB = e.target.result;

    if (!thisDB.objectStoreNames.contains("wordvecs")) {
      thisDB.createObjectStore("wordvecs");
    }

    if (!thisDB.objectStoreNames.contains("weights")) {
      thisDB.createObjectStore("weights");
    }

    if (!thisDB.objectStoreNames.contains("dataset")) {
      thisDB.createObjectStore("dataset");
    }
  }

  openRequest.onsuccess = function (e) {
    db = e.target.result;
    console.log("Initialization complete!");
  }

  openRequest.onerror = function (e) {
    console.log("Initialization error!");
  }
}

document.addEventListener("DOMContentLoaded", initializeDB, false);
