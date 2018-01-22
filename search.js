var searcher = (function () {
  var queryTerms;
  var phrases;
  var numDocs = 0;
  var resultsWordvecs;
  var sentResults;
  var sentence;

  var startTime;
  var i = 0;

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
      } else {
        resultsWordvecs[resultsWordvecs.length] = Array(queryTerms[i], Array());
      }
      wordvecSearchInit(callback, i + 1);
    };

  }

  function getithSentence(callback) {
    var cursor = db.transaction(["dataset"], "readonly")
      .objectStore("dataset")
      .openCursor(i);

    cursor.onsuccess = function (e) {
      var res = e.target.result;
      if (res) {
        sentence = res.value.comment;
        console.log(sentence);
        callback(sentence);
        i++;
      } else {
        console.log("No more sentences");
        i = 0;
        getithSentence(callback);
      }
    };
  }

  function sentenceSearchInit(callback, i) {
    if (i == phrases.length) {
      callback(sentResults);
      return;
    }

    var cursor = db.transaction(["wordvecs"], "readonly")
      .objectStore("wordvecs")
      .openCursor(phrases[i]);

    cursor.onsuccess = function (e) {
      var res = e.target.result;
      if (res) {
        sentResults[sentResults.length] = Array(phrases[i], res.value);
        res.continue;
      } else {
        sentResults[sentResults.length] = Array(phrases[i], Array());
      }
      sentenceSearchInit(callback, i + 1);
    };
  }

  return {
    search: function (qt, callbackWordvecs) {
      queryTerms = qt;
      resultsWordvecs = Array();
      wordvecSearchInit(callbackWordvecs, 0);
    },

    getSentence: function (callback) {
      sentence = "";
      getithSentence(callback);
    },

    showVecs: function (q, callback) {
      phrases = q;
      sentResults = Array();
      sentenceSearchInit(callback, 0);
    },

    setNumDocs: function (n) {
      numDocs = n;
    },
  };

})();
