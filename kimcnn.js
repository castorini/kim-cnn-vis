
// used for node.js
// var nj = require('numjs');

const VECTOR_LENGTH = 300;

var filtersExample = [[[0.01, 0.02],[0.03, 0.04],[0.05, 0.06]],
                [[-0.15,0.16],[0.2, -0.21],[-0.25,0.26],[0.3, -0.31]],
                [[0.23,0.24],[0.25, -0.2],[0.33,0.34],[0.15, -0.1],[0.43,0.44]]];

// build an input matrix for CNN
function build_input(results) {
    // range from [0.0, 1.0).

    var ret = results.map(function (result) {
        if (result[1].length <= 0) { // the word is not a top10k one
            // narraw random values down into range (-.25, .25]
            rmatrix = [];
            for (i = 0; i < VECTOR_LENGTH; i++) {
                rmatrix.push(0);
            }
            return rmatrix;
        }

        return result[1];
    });

    return ret;
}

// change this, need to use a different filter to convolve on each 3*300
function conv(input, weights, bias) {
    var padding = [];
    for(var i = 0, value = 0, size = 300, array = new Array(300); i < size; i++) {
      padding[i] = value;
    }
    var result = [];
    var k = 0;
    var paddedInput = [];

    for (var i = 0; i < input.length; i++) {
      paddedInput[i] = input[i];
    }
    for (var i = 0; i < weights.length; i++) {  // 3
      result[i] = [];
      if (i == 0) {
        paddedInput.unshift(padding);
        paddedInput.unshift(padding);
        paddedInput.push(padding);
        paddedInput.push(padding);
      } else if (i == 1) {
        paddedInput.unshift(padding);
        paddedInput.push(padding);
      } else if (i == 2) {
        paddedInput.unshift(padding);
        paddedInput.push(padding);
      }

      for (var j = 0; j < weights[i].length; j++) { // 100
        result[i][j] = nj.add(nj.convolve(paddedInput, weights[i][j]), bias[i][j]).tolist()
        if (result[i][j] < 0) {
          result[i][j] = 0;
        }
      }
    }
    return result;
}

// where the max comes from [i, j]
function argmax(input) {
    // console.log(input);
    if (input.length <= 0 || input[0].length <= 0) {
        return -1;
    }
    var ans = [0, 0];
    var max = input[0][0];
    for (var i = 0; i<input.length; i++) {
        for (var j = 0; j<input[0].length; j++) {
            if (input[i][j] > max) {
                max = input[i][j];
                ans = [i, j];
            }
        }
    }
    return ans;
}

function max_polling(input) {
  var res = [];
  for (var i = 0; i < input.length; i++) {
    res[i] = max_polling_helper(input[i]);
  }
  return res;
}

// input is an array of nj.array; return a nj.array of max polling after tanh
function max_polling_helper(input) {
    return [input.map(a => argmax(nj.tanh(a).tolist())),
            input.map(a => [nj.tanh(a).max()])];
}

function fc1(input, weights, bias) {
  // max polling result
  // input: [Array(100), Array(100), Array(100)]
  var combined = []; // size = 200
  for (var i = 0; i < input.length; i++) {
    for (var j = 0; j < input[i].length; j++) {
      combined[combined.length] = input[i][j];
    }
  }
  var mm = nj.dot(weights, combined).tolist();
  var res = [];
  for (var i = 0; i < mm.length; i++) {
    res[res.length] = [mm[i][0] + bias[i]];
  }
  return res;
}

// y = w z + b;
function soft_max(z) {
  console.log("before softmax: " + z)
    return nj.softmax(z).tolist();
}
/*
function get_filters(i) {
  var cursor = db.transaction(["weights"], "readonly")
    .objectStore("weights")
    .openCursor(i);

  cursor.onsuccess = function (e) {
    var res = e.target.result;
    if (res) {
      filters[filters.length] = res.value;
      res.continue;
    } else {
      console.log("Finished iterating");
      return;
    }
    get_filters(i + 1);
  };

}*/

function display_conv(label, results, query, weights, bias, weights_fc1, bias_fc1) {
    if (query.length < 5) {
        clean_up();
        return;
    }

    var input = build_input(results);
    var conv_res = conv(input, weights, bias);

    var args, polling_res;
    var max_poll_res = max_polling(conv_res); // [args, polling_res]
    // console.log(max_poll_res[0][1]) -> max polling res of 3 dim filter, 100 max values
    // console.log(args);
    var max_poll_res_real = [max_poll_res[0][1], max_poll_res[1][1], max_poll_res[2][1]];
    var fc1_res = fc1(max_poll_res_real, weights_fc1, bias_fc1);
    var output = soft_max(fc1_res);
    console.log(output)
    show_gradient_indicator();

    var temp_weights = [weights[0][0], weights[1][0], weights[2][0]];
    var temp_conv_res = [conv_res[0][0], conv_res[1][0], conv_res[2][0]];
    var temp_args = [max_poll_res[0][0][0], max_poll_res[1][0][0], max_poll_res[2][0][0]];
    var temp_polling_res = [max_poll_res_real[0][0], max_poll_res_real[1][0], max_poll_res_real[2][0]];

    show_network(query, input, temp_weights, temp_conv_res, temp_args, temp_polling_res, output);
    return output;
}
