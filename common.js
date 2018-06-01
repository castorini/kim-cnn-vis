$(document).ready(function() {
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

});
