var searcher = (function () {
  var phrases;
  var phrasesAll;
  var numDocs = 0;
  var sentence;
  var sentences;
  var labels;

  function wordvecsSearchInit(callback, q, results, i) {
    if (i == q.length) {
      callback(results);
      return;
    }

    var cursor = db.transaction(["wordvecs"], "readonly")
      .objectStore("wordvecs")
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
      wordvecsSearchInit(callback, q, results, i + 1);
    };

  }

  function searchAllParams(callback) {
    let store = db.transaction('kimcnn_parameters', 'readwrite').objectStore('kimcnn_parameters');
    let request = store.openCursor();
    let result = {};

    request.onsuccess = function (e) {
      let res = e.target.result;
      if (res) {
        result[res.primaryKey] = res.value;
        res.continue();
      } else {
        callback(result);
      }
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

    getParams: function (callback) {
      searchAllParams(callback);
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
      wordvecsSearchInit(callback, q, res, 0);
    },

    showVecsAll: function (qs, callback) {
      phrasesAll = qs;
      wordvecsSearchInit(callback, 0);
    },

    setNumDocs: function (n) {
      numDocs = n;
    },
  };

})();
