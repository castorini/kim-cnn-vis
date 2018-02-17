var indexer = (function () {
  var wordvecsMessageHandler = {};
  var wordvecsLargeMessageHandler = {};
  var weights3MessageHandler = {};
  var weights4MessageHandler = {};
  var weights5MessageHandler = {};
  var weightsfc1MessageHandler = {};
  var bias3MessageHandler = {};
  var bias4MessageHandler = {};
  var bias5MessageHandler = {};
  var biasfc1MessageHandler = {};
  var datasetMessageHandler = {};
  var numTokens = 0;
  var startTime;

  var word2vec;
  var word2vec_large;
  var weights;
  var bias;
  var dataset;
  var cur_dim;

  function round_and_fix(num) {
    var decimals = 4;
    var t = Math.pow(10, decimals);
    var res = (Math.round((num * t) + (decimals>0?1:0)*(Math.sign(num) * (10 / Math.pow(100, decimals)))) / t).toFixed(decimals);
    return parseFloat(res);
  }

  function get_weights(i) {
    if (i != 0 && i % 100 == 0) {
      if (cur_dim == 3) {
        weights3MessageHandler.update(startTime, new Date().getTime(), i);
      } else if (cur_dim == 4) {
        weights4MessageHandler.update(startTime, new Date().getTime(), i);
      } else if (cur_dim == 5){
        weights5MessageHandler.update(startTime, new Date().getTime(), i);
      } else {
        weightsfc1MessageHandler.update(startTime, new Date().getTime(), i);
      }
    }

    if (i == weights.length) {
      console.log("Finished loading weights.");
      if (cur_dim == 3) {
        weights3MessageHandler.finished(startTime, new Date().getTime(), i);
      } else if (cur_dim == 4) {
        weights4MessageHandler.finished(startTime, new Date().getTime(), i);
      } else if (cur_dim == 5){
        weights5MessageHandler.finished(startTime, new Date().getTime(), i);
      } else {
        weightsfc1MessageHandler.finished(startTime, new Date().getTime(), i);
      }
      return;
    }

    var db_name = "weights_" + cur_dim;
    var transaction = db.transaction([db_name], "readwrite");
    var store = transaction.objectStore(db_name);
    /*var weights_fixed = [];
    for (var k = 0; k < weights[i].length; k++) {
      weights_fixed[k] = [];
      for (var j = 0; j < weights[i][k].length; j++) {
        weights_fixed[k][j] = round_and_fix(weights[i][k][j]);
      }
    }*/
    var request = store.add(weights[i], i);

    request.onerror = function (e) {
      // Dispatch to error message handler
      if (cur_dim == 3) {
        weights3MessageHandler.error(e);
      } else if (cur_dim == 4) {
        weights4MessageHandler.error(e);
      } else if (cur_dim == 5) {
        weights5MessageHandler.error(e);
      } else {
        weightsfc1MessageHandler.error(e);
      }
    }

    request.onsuccess = function (e) {
      get_weights(i + 1);
    }
  }

  function get_bias(i) {
    if (i != 0 && i % 100 == 0) {
      if (cur_dim == 3) {
        bias3MessageHandler.update(startTime, new Date().getTime(), i);
      } else if (cur_dim == 4) {
        bias4MessageHandler.update(startTime, new Date().getTime(), i);
      } else if (cur_dim == 5) {
        bias5MessageHandler.update(startTime, new Date().getTime(), i);
      } else {
        biasfc1MessageHandler.update(startTime, new Date().getTime(), i);
      }
    }

    if (i == bias.length) {
      console.log("Finished loading bias.");
      if (cur_dim == 3) {
        bias3MessageHandler.finished(startTime, new Date().getTime(), i);
      } else if (cur_dim == 4) {
        bias4MessageHandler.finished(startTime, new Date().getTime(), i);
      } else if (cur_dim == 5) {
        bias5MessageHandler.finished(startTime, new Date().getTime(), i);
      } else {
        biasfc1MessageHandler.finished(startTime, new Date().getTime(), i);
      }
      return;
    }

    var db_name = "bias_" + cur_dim;
    var transaction = db.transaction([db_name], "readwrite");
    var store = transaction.objectStore(db_name);
    var request = store.add(bias[i][0], i);

    request.onerror = function (e) {
      // Dispatch to error message handler
      if (cur_dim == 3) {
        bias3MessageHandler.error(e);
      } else if (cur_dim == 4) {
        bias4MessageHandler.error(e);
      } else if (cur_dim == 5) {
        bias5MessageHandler.error(e);
      } else {
        biasfc1MessageHandler.error(e);
      }
    }

    request.onsuccess = function (e) {
      get_bias(i + 1);
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

    setWeightsfc1MessageHandler: function(h) {
      weightsfc1MessageHandler = h;
    },

    setBias3MessageHandler: function(h) {
      bias3MessageHandler = h;
    },

    setBias4MessageHandler: function(h) {
      bias4MessageHandler = h;
    },

    setBias5MessageHandler: function(h) {
      bias5MessageHandler = h;
    },

    setBiasfc1MessageHandler: function(h) {
      biasfc1MessageHandler = h;
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

    getBias: function (b, dim) {
      startTime = new Date().getTime();
      cur_dim = dim;
      bias = b;
      get_bias(0);
    },

    getDataset: function (w) {
      startTime = new Date().getTime();
      dataset = w;
      get_dataset(0);
    },
  };

})();
