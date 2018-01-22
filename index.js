var indexer = (function () {
  var wordvecsMessageHandler = {};
  var weightsMessageHandler = {};
  var numTokens = 0;
  var startTime;

  var word2vec;
  var weights;

  function get_weights(i) {
    if (i != 0 && i % 100 == 0) {
      weightsMessageHandler.update(startTime, new Date().getTime(), i);
    }

    if (i == weights.length) {
      console.log("Finished loading weights.");
      return;
    }

    var transaction = db.transaction(["weights"], "readwrite");
    var store = transaction.objectStore("weights");
    var item = [weights[i][0], weights[i][1]];
    var request = store.add(item, i);

    request.onerror = function (e) {
      // Dispatch to error message handler
      weightsMessageHandler.error(e);
    }

    request.onsuccess = function (e) {
      get_weights(i + 1);
    }
  }

  function index_wordvec(i) {
    if (i != 0 && i % 100 == 0) {
      wordvecsMessageHandler.update(startTime, new Date().getTime(), i);
    }

    if (i == word2vec.length) {
      console.log("Finished loading wordvecs.");
      return;
    }

    var transaction = db.transaction(["wordvecs"], "readwrite");
    var store = transaction.objectStore("wordvecs");
    var request = store.add(word2vec[i]["word2vec"], word2vec[i]["word"]);

    request.onerror = function (e) {
      // Dispatch to error message handler
      wordvecsMessageHandler.error(e);
    }

    request.onsuccess = function (e) {
      index_wordvec(i + 1);
    }
  }

  return {
    setWordvecsMessageHandler: function(h) {
      wordvecsMessageHandler = h;
    },

    setWeightsMessageHandler: function(h) {
      weightsMessageHandler = h;
    },

    index: function (w) {
      startTime = new Date().getTime();
      word2vec = w;
      index_wordvec(0);
    },

    getWeights: function (w) {
      startTime = new Date().getTime();
      weights = w;
      get_weights(0);
    },
  };

})();
