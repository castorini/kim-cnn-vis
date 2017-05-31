var searcher = (function () {
  var queryTerms;
  var numDocs = 0;
  var resultsWordvecs;

  var startTime;

  function wordvecSearchInit(callback, i) {
    if (i == queryTerms.length) { 
      console.log(resultsWordvecs); 
      callback(resultsWordvecs);
      return;
    }
    var qterm = queryTerms[i];
    var cursor = db.transaction(["wordvecs"], "readonly")
      .objectStore("wordvecs")
      .openCursor(qterm);

    cursor.onsuccess = function (e) {
      var res = e.target.result;
      if (res) {        
        resultsWordvecs[resultsWordvecs.length] = Array(queryTerms[i], res.value);
  res.continue;
      }
      wordvecSearchInit(callback, i + 1);
    };

  }

  return {
    search: function (qt, callbackWordvecs) {
      queryTerms = qt;
      resultsWordvecs = Array();
      wordvecSearchInit(callbackWordvecs, 0);
    },

    setNumDocs: function (n) {
      numDocs = n;
    }
  };

})();
