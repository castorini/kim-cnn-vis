function getUpdateMessageHander(messageDivId) {
  var updateMessageHandler = {
    update: function(startTime, currentTime, i) {
      console.log("Indexed " + i + " documents: Elapsed time = " + (currentTime - startTime) + "ms");
      $(`#${messageDivId}`).html(`<div class='alert alert-success alert-dismissible' role='alert'>
          <button type='button' class='close' data-dismiss='alert' aria-label='Close'>
          <span aria-hidden='true'>&times;</span></button>
          Indexed ${i} documents: Elapsed time ${currentTime - startTime} ms
        </div>`);
    },

    finished: function(startTime, currentTime, i) {
      console.log("Number of docs indexed: " + i);
      console.log("Indexing time: " + (currentTime - startTime) + "ms");
      $(`#${messageDivId}`).html(`<div class='alert alert-success alert-dismissible' role='alert'>
        <button type='button' class='close' data-dismiss='alert' aria-label='Close'>
        <span aria-hidden='true'>&times;</span></button>
        <strong>Indexing Complete!</strong>
        ${i} documents indexed in ${currentTime - startTime} ms.
      </div>`);
      statsButton();
    },

    error: function(e) {
      console.log("Error", e.target.error.name);
      $(`#${messageDivId}`).html(`<div class='alert alert-danger alert-dismissible' role='alert'>
        <button type='button' class='close' data-dismiss='alert' aria-label='Close'>
        <span aria-hidden='true'>&times;</span></button><strong>Error!</strong>
        Does an index already exist? If so, please delete old index first. (Also try refreshing the page.)
      </div>`);
    }
  };
  return updateMessageHandler;
}

$(document).ready(function() {

  initializeDB(() => {
    function statsButton() {
      console.log("Getting stats...");

      var statsCollectionToDivId = {
        wordvecs: 'word2vec300d-stats',
        kimcnn_parameters: 'parameters-stats',
        dataset: 'dataset'
      };

      Object.keys(statsCollectionToDivId).forEach(collection => {
        var statsDivId = statsCollectionToDivId[collection];
        try {
          var request = db.transaction([collection], "readonly")
            .objectStore(collection).count();

          request.onsuccess = function(e) {
            $(`#${statsDivId}`).html(e.target.result);
          }
        } catch (e) {
          console.log("Error opening index!");
          $(`#${statsDivId}`).html(0);
        }
      });
    }

    function deleteIndex() {
      // An important item to be a aware of is the promise that is returned
      // from the deleteDatabase method will not complete until all the other
      // connections to the database are closed.

      db.close();

      console.log("Deleting index...");

      var DBDeleteRequest = indexedDB.deleteDatabase("index");
      DBDeleteRequest.onerror = function(event) {
        console.log("Error deleting index.");
      };

      DBDeleteRequest.onsuccess = function(event) {
        console.log("Index deleted successfully");
        $('#word2vec300d-message').html('');
        statsButton();
      };

      // reinitialize in case user wants to re-index again.
      initializeDB.apply();
    }

    function weightButton() {
      var script = document.createElement('script');
      script.onload = function () {
        indexer.loadParams(model_params, statsButton);
      };
      script.src = 'parameters/model_parameters.js';
      document.head.appendChild(script);
    }

    function datasetButton() {
      var messageDivId = 'dataset-message';
      $(`#${messageDivId}`).html(`<div class='alert alert-success alert-dismissible' role='alert'>
        <button type='button' class='close' data-dismiss='alert' aria-label='Close'>
        <span aria-hidden='true'>&times;</span></button>Starting to get sentences...</div>`);

      indexer.setDatasetMessageHandler(getUpdateMessageHander(messageDivId));
      indexer.loadDataset(dev_dataset, statsButton);
    }

    function indexButton() {
      var dim = 300;
      var store_name = 'wordvecs';
      var messageDivId = 'word2vec300d-message';
      $(`#${messageDivId}`).html(`<div class='alert alert-success alert-dismissible' role='alert'>
      <button type='button' class='close' data-dismiss='alert' aria-label='Close'>
      <span aria-hidden='true'>&times;</span></button>Starting to fetch word vectors (${dim}d)...</div>`);

      var script = document.createElement('script');
      script.onload = function () {
        indexer.setWordvecsMessageHandler(getUpdateMessageHander(messageDivId));
        indexer.indexWord2Vec(word2veclarge, store_name, statsButton);
      };
      script.src = 'word2vec_large.js';
      document.head.appendChild(script);
    }

    statsButton();

    $('#stats-button').click(statsButton);
    $('#delete-index').click(deleteIndex);
    $('#load-weights').click(weightButton);
    $('#dataset-button').click(datasetButton);
    $('#build-index').click(indexButton);
  });
});
