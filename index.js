var indexer = (function () {
  var wordvecsMessageHandler = {};
  var wordvecsLargeMessageHandler = {};
  var weights3MessageHandler = {};
  var weights4MessageHandler = {};
  var weights5MessageHandler = {};
  var datasetMessageHandler = {};
  var numTokens = 0;
  var startTime;

  var word2vec;
  var word2vec_large;
  var weights;
  var dataset;
  var cur_dim;

  function get_weights(i) {
    if (i != 0 && i % 100 == 0) {
      if (cur_dim == 3) {
        weights3MessageHandler.update(startTime, new Date().getTime(), i);
      } else if (cur_dim == 4) {
        weights4MessageHandler.update(startTime, new Date().getTime(), i);
      } else {
        weights5MessageHandler.update(startTime, new Date().getTime(), i);
      }
    }

    if (i == weights.length) {
      console.log("Finished loading weights.");
      return;
    }

    var db_name = "weights_" + cur_dim;
    var transaction = db.transaction([db_name], "readwrite");
    var store = transaction.objectStore(db_name);
    var request = store.add(weights[i], i);

    request.onerror = function (e) {
      // Dispatch to error message handler
      if (cur_dim == 3) {
        weights3MessageHandler.error(e);
      } else if (cur_dim == 4) {
        weights4MessageHandler.error(e);
      } else {
        weights5MessageHandler.error(e);
      }
    }

    request.onsuccess = function (e) {
      get_weights(i + 1);
    }
  }

  function get_dataset(i) {
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
      get_dataset(i + 1);
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

  function index_wordvec_large(i) {
    if (i != 0 && i % 100 == 0) {
      wordvecsLargeMessageHandler.update(startTime, new Date().getTime(), i);
    }

    if (i == word2vec_large.length) {
      console.log("Finished loading wordvecs_large.");
      return;
    }

    var transaction = db.transaction(["wordvecslarge"], "readwrite");
    var store = transaction.objectStore("wordvecslarge");
    var request = store.add(word2vec_large[i]["word2vec"], word2vec_large[i]["word"]);

    request.onerror = function (e) {
      // Dispatch to error message handler
      wordvecsLargeMessageHandler.error(e);
    }

    request.onsuccess = function (e) {
      index_wordvec_large(i + 1);
    }
  }

  return {
    setWordvecsMessageHandler: function(h) {
      wordvecsMessageHandler = h;
    },

    setWordvecsLargeMessageHandler: function(h) {
      wordvecsLargeMessageHandler = h;
    },

    setWeights3MessageHandler: function(h) {
      weights3MessageHandler = h;
    },

    setWeights4MessageHandler: function(h) {
      weights4MessageHandler = h;
    },

    setWeights5MessageHandler: function(h) {
      weights5MessageHandler = h;
    },

    setDatasetMessageHandler: function(h) {
      datasetMessageHandler = h;
    },

    index: function (w) {
      startTime = new Date().getTime();
      word2vec = w;
      index_wordvec(0);
    },

    index_large: function (w) {
      startTime = new Date().getTime();
      word2vec_large = w;
      index_wordvec_large(0);
    },

    getWeights: function (w, dim) {
      startTime = new Date().getTime();
      cur_dim = dim;
      weights = w;
      get_weights(0);
    },

    getDataset: function (w) {
      startTime = new Date().getTime();
      dataset = w;
      get_dataset(0);
    },
  };

})();
