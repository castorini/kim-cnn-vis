var searcher = (function () {
  var phrases;
  var sentence;
  var sentences;
  var labels;

  function wordvecsSearchInit(callback, q, results, i) {
    if (i === q.length) {
      callback(results);
      return;
    }

    var cursor = db.transaction(["wordvecs"], "readonly")
      .objectStore("wordvecs")
      .openCursor(q[i]);

    // TODO: this is forcing one retrieval to follow the next.
    // would it more efficient to do this asynchronously?
    cursor.onsuccess = function (e) {
      var res = e.target.result;
      if (res) {
        results.push({
          word: q[i],
          word_vector: res.value
        });
      } else {
        results.push({
          word: q[i],
          word_vector: undefined
        });
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

  function getAllSentences(callback, i) {
    var cursor = db.transaction(["dataset"], "readonly")
      .objectStore("dataset")
      .openCursor(i);

    cursor.onsuccess = function (e) {
      var res = e.target.result;
      if (res) {
        sentence = res.value.comment;
        sentences[sentences.length] = sentence;
        labels[labels.length] = res.value.label;
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

    getSentenceAll: function (callback) {
      sentences = [];
      labels = [];
      getAllSentences(callback, 0);
    },

    showVecs: function (q, res, callback) {
      phrases = q;
      wordvecsSearchInit(callback, q, res, 0);
    },
  };

})();
