$(document).ready(function() {
  initializeDB(() => {
    setup(modelData => {
      // Querying
      var searchButton = function() {
        var q = document.querySelector("#query").value.split(" ").filter(x => x.length).map(x => x.toLowerCase());

        // Get word vectors
        searcher.showVecs(q, Array(), function(wordvecs) {
          var startTime = window.performance.now();
          updateMsg("Started processing sentence: " + q);
          console.log('retrieved');

          allFeatureActivations(wordvecs, q, modelData);
          updateMsg("Finished processing sentence in: " + (window.performance.now() - startTime) + "ms.");
        });
      };

      $('#searchButton').click(searchButton);
    });
    SearchBar.initAutocomplete();
  });
});
