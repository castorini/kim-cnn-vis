$(document).ready(function() {
  initializeDB(() => {
    setup(modelData => {
      // segments is a list of [query, label]
      var segments = [];
      for (var i = 0; i < modelData.dev_sentences.length; i++) {
        if (modelData.dev_sentences[i] == undefined) {
          continue;
        }
        var sentence = modelData.dev_sentences[i];
        var label = modelData.dev_labels[i];
        var q = sentence.split(" ");

        q = q.filter(function(x) { return x.length > 0 }).map(function(x) { return x.toLowerCase() });
        segments[i] = [q, label];
      }

      var nn_res = [];
      var test_res = [];
      var wordvec_time = 0;

      var showAll = function(ignore, b_index, test) {
        document.getElementById("sent").innerHTML = "";

        updateMsg("Started processing sentences.");

        batch_size = batch_size || 64;
        b_index = b_index || 0;
        test = test || false;

        var currentSegment = segments.slice(b_index*batch_size, (b_index+1)*batch_size);

        var startTime = window.performance.now();
        let requests = currentSegment.map(function(q) {
          return new Promise(function(resolve, reject) {
            searcher.showVecs(q[0], Array(), function(results) {
              var ret = [q, results];
              if (ret != undefined) {
                resolve(ret);
              } else {
                resolve("failed");
              }
            });
          });
        });

        Promise.all(requests).then(function(responses) {
          wordvec_time = window.performance.now() - startTime;
          // [[[],#],[list of arrays]]
          var labels = [];
          var embeddings = [];
          var qs = [];
          var max_len = 0;
          for (var i = 0; i < responses.length; i++) {
            labels[i] = responses[i][0][1];
            qs[i] = responses[i][0][0];
            embeddings[i] = build_input(responses[i][1]);
            if (responses[i][1].length > max_len) {
              max_len = responses[i][1].length;
            }
          }

          var fill = new Array(300).fill(0);

          // Pad ending of embeddings with zeros
          for (var i = 0; i < responses.length; i++) {
            while (embeddings[i].length < max_len) {
              var cur = embeddings[i].length;
              embeddings[i][cur] = fill;
            }
          }

          if (test) {
            if (batch_size === 1) {
              var new_res = [];
              for (var k = 0; k < embeddings[0].length; k++) {
                new_res[k] = [qs[0][k], embeddings[0][k]]
              }

              var ret = display_single_conv(new_res, qs[0], modelData.weights, modelData.bias, modelData.fc_weights, modelData.fc_bias, true);

              if (b_index === 100) {
                updateMsg("Finished processing " + responses.length + " sentences in " + ret + "ms.");
                if (ret != undefined) {
                  test_res[test_res.length] = ret;
                }
                updateMsg("Done");
                average();
              } else {
                updateMsg("Finished processing " + responses.length + " sentences in " + ret + "ms. ");
                if (ret != undefined) {
                  test_res[test_res.length] = ret;
                }
                showAll(undefined, b_index+1, true)
              }
            } else {
              var ret = display_conv_batch(batch_size, max_len, labels, embeddings, qs, modelData.weights, modelData.bias, modelData.fc_weights, modelData.fc_bias, ignore, true);

              if (b_index === 3) { // (b_index+1)*batch_size+batch_size > dev_sentences.length
                updateMsg("Finished processing " + responses.length + " sentences in " + ret + "ms.");
                test_res[test_res.length] = ret;
                updateMsg("Done");
                average();
              } else {
                updateMsg("Finished processing " + responses.length + " sentences in " + ret + "ms. ");
                console.log(ret);
                test_res[test_res.length] = ret;
                showAll(undefined, b_index+1, true)
              }
            }
          } else {
            startTime = window.performance.now();
            var ret = display_conv_batch(batch_size, max_len, labels, embeddings, qs, modelData.weights, modelData.bias, modelData.fc_weights, modelData.fc_bias, ignore, false);

            if ((b_index+1)*batch_size+batch_size > modelData.dev_sentences.length) {
              updateMsg("Finished processing " + responses.length + " sentences in " + ret + "ms.");
              for (var i = 0; i < ret.length; i++) {
                nn_res[nn_res.length] = ret[i];
              }
              updateMsg("Done");
            } else {
              for (var i = 0; i < ret.length; i++) {
                nn_res[nn_res.length] = ret[i];
              }
              showAll(undefined, b_index+1, false)
            }
          }
        });
      };

      function average() {
        var sum = 0;
        for (var i = 0; i < test_res.length; i++) {
          sum += test_res[i];
        }

        updateMsg("average: " + sum/test_res.length + ", average word vectors fetch time: " + wordvec_time);
      }

      function batchButton() {
        test_res = [];
        batch_size = parseInt(document.querySelector("#batch").value);
        updateMsg("Batch size set to " + batch_size);
      }

      var filter_res = [];
      function byFilter(show_positive, ignore) {
        document.getElementById("sent").innerHTML = "";
        var startTime = window.performance.now();
        updateMsg("Started processing filters.");

        var groupByFilter = []; // 3*100
        for (var d = 0; d < 3; d++) {
          groupByFilter[d] = [];
          for (var f = 0; f < 100; f++) {
            groupByFilter[d][f] = []; // 3*100*#sentences*2
          }
        }

        for (var i = 0; i < nn_res.length; i++) {  // number of sentences analyzed
          var max_poll_res = nn_res[i][2];  // [[2],[2],[2]]

          for (var d = 0; d < 3; d++) {
            for (var f = 0; f < 100; f++) {
              groupByFilter[d][f][i] = [max_poll_res[d][1][f], i]; // dth/3 dim, fth/100 filter
            }
          }
        }

        for (var d = 0; d < 3; d++) {
          for (var f = 0; f < groupByFilter[d].length; f++) {
            if (show_positive == undefined || show_positive === true) {
              (groupByFilter[d][f]).sort(function(a, b){return b[0]-a[0]});
            } else {
              (groupByFilter[d][f]).sort(function(a, b){return a[0]-b[0]});
            }
          }
        }

        var prev_d = -1;
        var prev_f = -1;
        for (var d = 0; d < 3; d++) {
          filter_res[d] = [];
          for (var f = 0; f < groupByFilter[d].length; f++) { // 100
            filter_res[d][f] = [];
            for (var k = 0; k < 10; k++) {  // top 10 activations
              var index = groupByFilter[d][f][k][1];
              var draw = nn_res[index][0];
              var max_poll_res = nn_res[index][2];

              var matchedIndex = filter_max_index_non_tensor(max_poll_res);
              var idx = matchedIndex[d][f];

              if (d == 0) {
                idx -= 2;
              } else if (d == 1) {
                idx -= 3;
              } else {
                idx -= 4;
              }
              var len = draw[0].length;
              var highlight = [];
              for (var i = 0; i < len; i++) {
                highlight[highlight.length] = [draw[0][i][0], 0];
              }
              var dim = d+3;
              for (var p = 0; p < dim; p++) {
                if (idx+p < 0 || idx+p >= len-1) {
                  continue;
                }
                highlight[idx+p][1] = 1;
              }

              if (d !== prev_d || f !== prev_f) {
                filter_res[d][f][k] = [highlight, draw, [d+3, f], true, modelData.bias[d][f].toFixed(2)];
                display_sentence_coloring(highlight, draw[1], draw[2], [d+3, f], true, modelData.bias[d][f].toFixed(2));
                prev_d = d;
                prev_f = f;
              } else {
                filter_res[d][f][k] = [highlight, draw, [-1, -1], true, -1];
                display_sentence_coloring(highlight, draw[1], draw[2], [-1,-1], true, -1);
              }
            }
          }
        }
        updateMsg("Finished processing 300 filters in " + (window.performance.now() - startTime)/1000 + "s.");
      }

      function show_negative_weights() {
        var checkBox = document.getElementById("show_nw_checkbox");
        byFilter(!checkBox.checked);
      }

      $('#start').click(() => showAll(undefined, 0, true));
      $('#batchButton').click(batchButton);
      $('#byFilter').click(byFilter);
      $('#show_nw_checkbox').click(show_negative_weights);
      $('#showAll').click(showAll(undefined, 0, false));
    });
  });
});