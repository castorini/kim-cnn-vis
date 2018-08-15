function updateMsg(msg) {
  document.getElementById('message').innerHTML = "<div class='alert alert-success alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" + msg + "</div>";
}

function setup(cb) {
  var startTime = window.performance.now();
  var modelData = {};
  updateMsg("Started loading parameters.");

  searcher.getParams(function(params) {
    modelData.weights = Array(params.conv3_weights, params.conv4_weights, params.conv5_weights);
    modelData.bias = Array(params.conv3_biases, params.conv4_biases, params.conv5_biases);
    modelData.fc_weights = params.fc_weights;
    modelData.fc_bias = params.fc_biases;

    searcher.getSentenceAll(function(sentences, labels) {
      modelData.dev_sentences = sentences;
      modelData.dev_labels = labels;
      updateMsg("Finished loading parameters in " + (window.performance.now() - startTime)/1000 + "s.");
      cb(modelData);
    });
  });
}

var SearchBar = {};
$(document).ready(function() {
  SearchBar.initAutocomplete = function() {
    var sampleSentences = sampleInputs.map(d => d.sentence);
    var input = document.getElementById('query');
    var comboplete = new Awesomplete(input, {
      minChars: 0,
      maxItems: 12,
      list: sampleSentences,
      sort: function (a, b) {
        return a.length > b.length;
      }
    });

    Awesomplete.$('#query').addEventListener('click', function() {
      if (comboplete.ul.childNodes.length === 0) {
        comboplete.minChars = 0;
        comboplete.evaluate();
      }
      else if (comboplete.ul.hasAttribute('hidden')) {
        comboplete.open();
      }
      else {
        comboplete.close();
      }
    });
  }
});
