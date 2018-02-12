var searcher = (function () {
  var queryTerms;
  var phrases;
  var phrasesAll;
  var numDocs = 0;
  var resultsWordvecs;
  var sentResults;
  var sentResultsAll;
  var sentence;
  var sentences;
  var labels;
  var weight;
  var bias;

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
      } else {
        resultsWordvecs[resultsWordvecs.length] = Array(queryTerms[i], Array());
      }
      wordvecSearchInit(callback, i + 1);
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

  function wordvecLargeSearchInit(callback, q, results, i) {
    if (i == q.length) {
      callback(results);
      return;
    }

    var cursor = db.transaction(["wordvecslarge"], "readonly")
      .objectStore("wordvecslarge")
      .openCursor(q[i]);

    cursor.onsuccess = function (e) {
      var res = e.target.result;
      if (res) {
        results[results.length] = Array(q[i], res.value);
        res.continue;
      } else {
        // console.log("Word2Vec not found for word: " + phrases[i]);
        results[results.length] = Array(q[i], Array());
      }
      wordvecLargeSearchInit(callback, q, results, i + 1);
    };

  }

  function searchWeightsWithDim(callback, i, db_name, count) {
    if (i == count) {
        callback(weights);
        return;
    }

    var cursor = db.transaction([db_name], "readonly")
      .objectStore(db_name)
      .openCursor(i);

    cursor.onsuccess = function (e) {
      var res = e.target.result;
      if (res) {
        weights[weights.length] = res.value;
        // console.log(res.value);
        res.continue
      } else {
        weights[weights.length] = Array();
      }
      searchWeightsWithDim(callback, i+1, db_name, count);
    };
  }

  function searchBiasWithDim(callback, i, db_name, count) {
    if (i == count) {
        callback(bias);
        return;
    }

    var cursor = db.transaction([db_name], "readonly")
      .objectStore(db_name)
      .openCursor(i);

    cursor.onsuccess = function (e) {
      var res = e.target.result;
      if (res) {
        bias[bias.length] = res.value;
        res.continue;
      } else {
        bias[bias.length] = Array();
      }
      searchBiasWithDim(callback, i+1, db_name, count);
    };
  }

  function getithSentence(index, callback) {
    var cursor = db.transaction(["dataset"], "readonly")
      .objectStore("dataset")
      .openCursor(index);

    cursor.onsuccess = function (e) {
      var res = e.target.result;
      if (res) {
        sentence = res.value.comment;
        label = res.value.label;
        callback(sentence, label);
      } else {
        console.log("No more sentences");
      }
    };
  }

  function getAllSentences(callback, i) {
    var cursor = db.transaction(["dataset"], "readonly")
      .objectStore("dataset")
      .openCursor(i);

    cursor.onsuccess = function (e) {
      var res = e.target.result;
      if (res) {
        sentence = res.value.comment;
        label = res.value.label;
        sentences[sentences.length] = sentence;
        labels[labels.length] = label;
        getAllSentences(callback, i+1);
      } else {
        callback(sentences, labels);
      }
    };
  }

  return {
    search: function (qt, callbackWordvecs) {
      queryTerms = qt;
      resultsWordvecs = Array();
      wordvecSearchInit(callbackWordvecs, 0);
    },

    getWeights: function (db_name, callback) {
      weights = [];
      getDBCount(db_name, function(count) {
        searchWeightsWithDim(callback, 0, db_name, count);
      })
    },

    getBias: function (db_name, callback) {
      bias = [];
      getDBCount(db_name, function(count) {
        searchBiasWithDim(callback, 0, db_name, count);
      })
    },

    getSentence: function (i, callback) {
      sentence = "";
      getithSentence(i, callback);
    },

    getSentenceAll: function (callback) {
      sentences = [];
      labels = [];
      getAllSentences(callback, 0);
    },

    showVecs: function (q, res, callback) {
      phrases = q;
      sentResults = Array();
      wordvecLargeSearchInit(callback, q, res, 0);
    },

    showVecsAll: function (qs, callback) {
      phrasesAll = qs;
      sentResultsAll = Array();
      wordvecLargeSearchInit(callback, 0);
    },

    setNumDocs: function (n) {
      numDocs = n;
    },
  };

})();
