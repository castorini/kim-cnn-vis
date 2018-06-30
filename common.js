var weights;
var bias;
var fc_weights;
var fc_bias;
var dev_sentences;
var dev_labels;

function initializeParameters() {
  setTimeout(function(){
    setup();
  }, 200);
}

function updateMsg(msg) {
  document.getElementById('message').innerHTML = "<div class='alert alert-success alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" + msg + "</div>";
}

function setup() {
  var startTime = window.performance.now();
  updateMsg("Started loading parameters.");

  searcher.getBias("bias_3", function(bias_3) {
     searcher.getBias("bias_4", function(bias_4) {
       searcher.getBias("bias_5", function(bias_5) {

         searcher.getWeights("weights_3", function(weights_3) {
           searcher.getWeights("weights_4", function(weights_4) {
             searcher.getWeights("weights_5", function(weights_5) {

                searcher.getBias("bias_fc1", function(bias_fc1) {
                  searcher.getWeights("weights_fc1", function(weights_fc1) {
                    weights = Array(weights_3, weights_4, weights_5);
                    bias = Array(bias_3, bias_4, bias_5);
                    fc_weights = weights_fc1;
                    fc_bias = bias_fc1;

                    searcher.getSentenceAll(function(sentences, labels) {
                      dev_sentences = sentences;
                      dev_labels = labels;
                      updateMsg("Finished loading parameters in " + (window.performance.now() - startTime)/1000 + "s.");
                    });
                  });
                });
              });
            });
          });
       });
     });
   });
}

var SearchBar = {};
$(document).ready(function() {
  SearchBar.initAutocomplete = function() {
    var sampleSentences = sampleInputs.map(d => d.sentence);
    var input = document.getElementById("query");
    var comboplete = new Awesomplete(input, {
      minChars: 0,
      maxItems: 12,
      list: sampleSentences,
      sort: function (a, b) {
        return a.length > b.length;
      }
    });

    Awesomplete.$('#query').addEventListener("click", function() {
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
