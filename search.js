var searcher = (function () {
  var queryTerms;
  var phrases;
  var numDocs = 0;
  var resultsWordvecs;
  var sentResults;
  var sentence;
  var weight

  var startTime;
  var index = 0;

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

  function wordvecLargeSearchInit(callback, i) {
    if (i == phrases.length) {
      callback(sentResults);
      return;
    }

    var cursor = db.transaction(["wordvecslarge"], "readonly")
      .objectStore("wordvecslarge")
      .openCursor(phrases[i]);

    cursor.onsuccess = function (e) {
      var res = e.target.result;
      if (res) {
        sentResults[sentResults.length] = Array(phrases[i], res.value);
        res.continue;
      } else {
        console.log("Word2Vec not found for word: " + phrases[i]);
        sentResults[sentResults.length] = Array(phrases[i], Array());
      }
      wordvecLargeSearchInit(callback, i + 1);
    };

  }

  function searchWeightsWithDim(callback, i, dim, count) {
    if (i == count) {
        callback(weights);
        return;
    }

    var db_name = "weights_" + dim
    var cursor = db.transaction([db_name], "readonly")
      .objectStore(db_name)
      .openCursor(i);

    cursor.onsuccess = function (e) {
      var res = e.target.result;
      if (res) {
        weights[weights.length] = Array(res.value);
        //console.log(weights[weights.length]);
      } else {
        weights[weights.length] = Array();
      }
      searchWeightsWithDim(callback, i+1, dim, count);
    };
  }

  function getithSentence(callback) {
    var cursor = db.transaction(["dataset"], "readonly")
      .objectStore("dataset")
      .openCursor(index);

    cursor.onsuccess = function (e) {
      var res = e.target.result;
      if (res) {
        sentence = res.value.comment;
        console.log(sentence);
        callback(sentence);
        index++;
      } else {
        console.log("No more sentences");
        index = 0;
        getithSentence(callback);
      }
    };
  }

  function getDBCount(db_name, callback) {
    try{
      var request1 = db.transaction([db_name], "readonly")
                       .objectStore(db_name).count();

      request1.onsuccess = function(e) {
        var count = e.target.result;
        callback(count);
      }
    } catch (e) {
      console.log("Error opening weights!");
    }
  }

  return {
    search: function (qt, callbackWordvecs) {
      queryTerms = qt;
      resultsWordvecs = Array();
      wordvecSearchInit(callbackWordvecs, 0);
    },

    getWeights: function (dim, callback) {
      weights = [];
      getDBCount("weights_" + dim, function(count) {
        searchWeightsWithDim(callback, 0, dim, count);
      })
    },

    getSentence: function (callback) {
      sentence = "";
      getithSentence(callback);
    },

    showVecs: function (q, callback) {
      phrases = q;
      sentResults = Array();
      wordvecLargeSearchInit(callback, 0);
    },

    setNumDocs: function (n) {
      numDocs = n;
    },
  };

})();
