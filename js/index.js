var indexer = (function () {
  var wordvecsMessageHandler = {};
  var datasetMessageHandler = {};
  var startTime;

  var dataset;
  var weightsLoaded = 0;

  function index_dataset(i) {
    if (i !== 0 && i % 100 === 0) {
      datasetMessageHandler.update(startTime, new Date().getTime(), i);
    }

    if (i === dataset.length) {
      console.log("Finished loading dataset.");
      return;
    }

    var transaction = db.transaction(["dataset"], "readwrite");
    var store = transaction.objectStore("dataset");
    var request = store.add(dataset[i], i);

    request.onerror = function (e) {
      // Dispatch to error message handler
      datasetMessageHandler.error(e);
    };

    request.onsuccess = function (e) {
      index_dataset(i + 1);
    };
  }

  function index_wordvec(i, word2vec, store_name) {
    if (i !== 0 && i % 100 === 0) {
      wordvecsMessageHandler.update(startTime, new Date().getTime(), i);
    }

    if (i === word2vec.length) {
      console.log("Finished loading wordvecs.");
      return;
    }

    var transaction = db.transaction([store_name], "readwrite");
    var store = transaction.objectStore(store_name);
    var request = store.add(word2vec[i]["word2vec"], word2vec[i]["word"]);

    request.onerror = function (e) {
      // Dispatch to error message handler
      wordvecsMessageHandler.error(e);
    };

    request.onsuccess = function (e) {
      index_wordvec(i + 1, word2vec, store_name);
    };
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

    loadParams: function (params, cb) {
      var store = db.transaction('kimcnn_parameters', 'readwrite').objectStore('kimcnn_parameters');
      var kv_pairs_count = Object.keys(model_params).length;
      Object.keys(params).forEach(k => {
        var request = store.add(params[k], k);
        request.onsuccess = e => {
          weightsLoaded++;
          if (weightsLoaded === kv_pairs_count) {
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
