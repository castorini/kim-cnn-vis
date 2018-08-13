$(document).ready(function() {
  initializeDB(() => {
    setup(modelData => {
      // Querying
      var searchButton = function() {
        var q = document.querySelector("#query").value.split(" ");
        if (q.length == 1 && q[0] == "") {
          q = "it 's a remarkably solid and subtly satirical tour de force .".split(" ");
        }
        q = q.filter(function(x) { return x.length > 0 }).map(function(x) { return x.toLowerCase() });

        // Get word vectors
        searcher.showVecs(q, Array(), function(wordvecs) {
          var startTime = window.performance.now();
          updateMsg("Started processing sentence: " + q);

          all_feature_activations(wordvecs, q, modelData);
          updateMsg("Finished processing sentence in: " + (window.performance.now() - startTime) + "ms.");
        });
      };

      $('#searchButton').click(searchButton);
    });
    SearchBar.initAutocomplete();
  });
});
