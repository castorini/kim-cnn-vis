$(document).ready(function() {
  initializeDB(() => {
    setup(modelData => {
      // Querying
      var searchButton = function() {
        document.getElementById("sent").innerHTML = "";
        var q = document.querySelector("#query").value.split(" ").filter(x => x.length).map(x => x.toLowerCase());

        // Get word vectors
        var startTime = window.performance.now();
        searcher.showVecs(q, Array(), function(wordvecs) {
          updateMsg("Started processing sentence: " + q);
          displaySingleConv(wordvecs, q, modelData);
          updateMsg("Finished processing sentence in: " + (window.performance.now() - startTime) + "ms.");
          // display_cnn(results, q);
        });
      };

      $('#searchButton').click(searchButton);
    });
  });
  SearchBar.initAutocomplete();
});
