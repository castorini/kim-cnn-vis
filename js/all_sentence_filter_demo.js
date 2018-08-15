$(document).ready(function() {
  initializeDB(() => {
    setup(modelData => {
      var segments = [];
      for (var i = 0; i < modelData.dev_sentences.length; i++) {
        segments.push({
          tokenized_query: modelData.dev_sentences[i].split(" ").filter(x => x.length).map(x => x.toLowerCase()),
          label: modelData.dev_labels[i]
        })
      }

      var nn_res = [];
      var test_res = [];
      var wordvec_time = 0;

      var showAll = function(ignore, b_index, test) {
        document.getElementById("sent").innerHTML = "";

        batch_size = batch_size || 64;
        b_index = b_index || 0;
        test = test || false;

        var currentSegment = segments.slice(b_index*batch_size, (b_index+1)*batch_size);

        var startTime = window.performance.now();
        let requests = currentSegment.map(function(q) {
          return new Promise(function(resolve, reject) {
            searcher.showVecs(q.tokenized_query, Array(), function(results) {
              q.word_vectors = results;
              resolve(q);
            });
          });
        });

        Promise.all(requests).then(function(inputs) {
          wordvec_time = window.performance.now() - startTime;

          // Build sentence embedding for each query
          var max_len = 0;
          for (var i = 0; i < inputs.length; i++) {
            inputs[i].embedding = buildSentenceEmbedding(inputs[i].word_vectors);
            max_len = Math.max(max_len, inputs[i].word_vectors.length)
          }

          // Pad ending of embeddings with zeros
          var fill = new Array(300).fill(0);
          for (var i = 0; i < inputs.length; i++) {
            while (inputs[i].embedding.length < max_len) {
              inputs[i].embedding.push(fill);
            }
          }

          if (test) {
            if (batch_size === 1) {
              let timeElapsed = displaySingleConv(inputs[0].word_vectors, inputs[0].tokenized_query, modelData, true);
              updateMsg("Finished processing " + inputs.length + " sentences in " + timeElapsed + "ms.");
              test_res.push(timeElapsed);

              if (b_index === 100) {
                updateMsg("Done");
                average();
              } else {
                showAll(undefined, b_index+1, true)
              }
            } else {
              let timeElapsed = displayBatchConv(batch_size, inputs, modelData, true);
              updateMsg("Finished processing " + inputs.length + " sentences in " + timeElapsed + "ms.");
              test_res.push(timeElapsed);

              if (b_index === 3) { // (b_index+1)*batch_size+batch_size > dev_sentences.length
                updateMsg("Done");
                average();
              } else {
                showAll(undefined, b_index+1, true)
              }
            }
          } else {
            startTime = window.performance.now();
            let ret = displayBatchConv(batch_size, inputs, modelData, ignore, false);
            for (var i = 0; i < ret.length; i++) {
              nn_res.push(ret[i]);
            }
            if ((b_index+1)*batch_size+batch_size > modelData.dev_sentences.length) {
              updateMsg("Done");
            } else {
              updateMsg("Finished processing batch " + b_index);
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

      function byFilter(show_positive, ignore) {
        document.getElementById("sent").innerHTML = "";
        var startTime = window.performance.now();
        updateMsg("Started processing filters.");

        var groupByFilter = []; // 3*100
        for (var d = 0; d < 3; d++) {
          groupByFilter.push([]);
          for (var f = 0; f < 100; f++) {
            groupByFilter[d].push([]); // 3*100*#sentences
          }
        }

        for (var i = 0; i < nn_res.length; i++) {  // number of sentences analyzed
          for (var d = 0; d < 3; d++) {
            for (var f = 0; f < 100; f++) {
              groupByFilter[d][f][i] = {
                max_pool_res: nn_res[i].max_pool_res[d][1][f],
                sentence_idx: i
              }
            }
          }
        }

        for (var d = 0; d < 3; d++) {
          for (var f = 0; f < groupByFilter[d].length; f++) {
            if (show_positive == undefined || show_positive) {
              groupByFilter[d][f].sort((a, b) => b.max_pool_res - a.max_pool_res);
            } else {
              groupByFilter[d][f].sort((a, b) => a.max_pool_res - b.max_pool_res);
            }
          }
        }

        var prev_d = -1;
        var prev_f = -1;
        for (var d = 0; d < 3; d++) {
          for (var f = 0; f < groupByFilter[d].length; f++) { // 100
            for (var k = 0; k < 10; k++) {  // top 10 activations
              var index = groupByFilter[d][f][k].sentence_idx;
              var matchedIndex = filter_max_index_non_tensor(nn_res[index].max_pool_res);
              var idx = matchedIndex[d][f];

              if (d === 0) {
                idx -= 2;
              } else if (d === 1) {
                idx -= 3;
              } else {
                idx -= 4;
              }
              var highlight = [];
              for (var i = 0; i < nn_res[index].highlight.length; i++) {
                highlight[highlight.length] = [nn_res[index].highlight[i][0], 0];
              }
              var dim = d+3;
              for (var p = 0; p < dim; p++) {
                if (idx+p < 0 || idx+p >= nn_res[index].highlight.length-1) {
                  continue;
                }
                highlight[idx+p][1] = 1;
              }

              if (d !== prev_d || f !== prev_f) {
                display_sentence_coloring(highlight, nn_res[index].label, nn_res[index].prediction, [d+3, f], true, modelData.bias[d][f].toFixed(2));
                prev_d = d;
                prev_f = f;
              } else {
                display_sentence_coloring(highlight, nn_res[index].label, nn_res[index].prediction, [-1,-1], true, -1);
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