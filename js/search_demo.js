$(document).ready(function() {
  initializeDB(() => {
    setup(modelData => {
      // Querying
      var searchButton = function() {
        document.getElementById("sent").innerHTML = "";
        var q = document.querySelector("#query").value.split(" ");
        q = q.filter(function(x) { return x.length > 0 }).map(function(x) { return x.toLowerCase() });

        // Get word vectors
        var startTime = window.performance.now();
        searcher.showVecs(q, Array(), function(wordvecs) {
          updateMsg("Started processing sentence: " + q);
          display_single_conv(wordvecs, q, modelData.weights, modelData.bias, modelData.fc_weights, modelData.fc_bias);
          updateMsg("Finished processing sentence in: " + (window.performance.now() - startTime) + "ms.");
          // display_cnn(results, q);
        });
      };

      $('#searchButton').click(searchButton);
    });
  });
  SearchBar.initAutocomplete();
});
