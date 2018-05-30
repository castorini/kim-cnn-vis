var indexer = (function () {
  var wordvecsMessageHandler = {};
  var datasetMessageHandler = {};
  var numTokens = 0;
  var startTime;

  var dataset;
  var cur_dim;
  var weightsLoaded = 0;

  function round_and_fix(num) {
    var decimals = 4;
    var t = Math.pow(10, decimals);
    var res = (Math.round((num * t) + (decimals>0?1:0)*(Math.sign(num) * (10 / Math.pow(100, decimals)))) / t).toFixed(decimals);
    return parseFloat(res);
  }

  function index_dataset(i) {
    if (i != 0 && i % 100 == 0) {
      datasetMessageHandler.update(startTime, new Date().getTime(), i);
    }

    if (i == dataset.length) {
      console.log("Finished loading dataset.");
      return;
    }

    var transaction = db.transaction(["dataset"], "readwrite");
    var store = transaction.objectStore("dataset");
    var request = store.add(dataset[i], i);

    request.onerror = function (e) {
      // Dispatch to error message handler
      datasetMessageHandler.error(e);
    }

    request.onsuccess = function (e) {
      index_dataset(i + 1);
    }
  }

  function index_wordvec(i, word2vec, store_name) {
    if (i != 0 && i % 100 == 0) {
      wordvecsMessageHandler.update(startTime, new Date().getTime(), i);
    }

    if (i == word2vec.length) {
      console.log("Finished loading wordvecs.");
      return;
    }

    var transaction = db.transaction([store_name], "readwrite");
    var store = transaction.objectStore(store_name);
    var request = store.add(word2vec[i]["word2vec"], word2vec[i]["word"]);

    request.onerror = function (e) {
      // Dispatch to error message handler
      wordvecsMessageHandler.error(e);
    }

    request.onsuccess = function (e) {
      index_wordvec(i + 1, word2vec, store_name);
    }
  }

  return {
    setWordvecsMessageHandler: function(h) {
      wordvecsMessageHandler = h;
    },

    setDatasetMessageHandler: function(h) {
      datasetMessageHandler = h;
    },

    indexWord2Vec: function (word2vec, store_name) {
      startTime = new Date().getTime();
      index_wordvec(0, word2vec, store_name);
    },

    loadWeights: function (weights, dim, cb) {
      var db_name = "weights_" + dim;
      var transaction = db.transaction([db_name], "readwrite");
      var store = transaction.objectStore(db_name);
      weights.forEach((w, i) => {
        var request = store.add(w, i);
        request.onsuccess = e => {
          weightsLoaded++;
          if (weightsLoaded === 612) {
            cb();
          }
        };
      });
    },

    loadBias: function (biases, dim, cb) {
      var db_name = "bias_" + dim;
      var transaction = db.transaction([db_name], "readwrite");
      var store = transaction.objectStore(db_name);
      biases.forEach((b, i) => {
        var request = store.add(b[0], i);
        request.onsuccess = e => {
          weightsLoaded++;
          if (weightsLoaded === 612) {
            cb();
          }
        };
      });
    },

    loadDataset: function (w) {
      startTime = new Date().getTime();
      dataset = w;
      index_dataset(0);
    },
  };

})();
