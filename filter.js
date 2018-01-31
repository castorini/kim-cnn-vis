
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
                //rmatrix.push((Math.random()-0.5)/2);
                rmatrix.push(0);
            }
            return rmatrix;
        }

        return result[1];
    });

    return ret;
}

function cconv(input, weight, bias, dim) {
  var sum = [];
  dim += 3;
  for (var r = 0; r < input.length-dim+1; r++) {
    sum[r] = [];
    sum[r][0] = 0;
    for (var i = 0; i < 300; i++) {
      sum[r][0] += input[r+0][i] * weight[0][i];
      sum[r][0] += input[r+1][i] * weight[1][i];
      sum[r][0] += input[r+2][i] * weight[2][i];
    }
    sum[r][0] += bias;
  }
  return sum;
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
        result[i][j] = cconv(paddedInput, weights[i][j], bias[i][j], i);
        if (result[i][j] < 0) {
          result[i][j] = 0;
        }
      }
    }
    return result;
}

// where the max comes from [i, j]
function argmax(input) {
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
  for (var i = 0; i < input.length; i++) {  // 3
    for (var j = 0; j < input[i].length; j++) { // 100
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
    return nj.softmax(z).tolist();
}


// where the max comes from [i, j]
function get_max(input) {
    // console.log(input);
    if (input.length <= 0 || input[0].length <= 0) {
        return -1;
    }
    var max = input[0][0];
    var ans = [max, 0];
    for (var i = 0; i<input.length; i++) {
        if (input[i][0] > max) {
            max = input[i][0];
            ans = [max, i];
        }
    }
    return ans;
}

function filter_max_index(max_poll) {
  var res = [];
  for (var dim = 0; dim < max_poll.length; dim++) { // 3
    res[dim] = [];
    for (var c = 0; c < max_poll[dim][0].length; c++) { // 100
      res[dim][c] = max_poll[dim][0][c][0];
    }
  }
  return res;
}

function filter_max_weight(max_poll) {
  var res = [];
  for (var dim = 0; dim < max_poll.length; dim++) { // 3
    res[dim] = [];
    for (var c = 0; c < max_poll[dim][0].length; c++) { // 100
      res[dim][c] = max_poll[dim][1][c][0];
    }
  }
  return res;
}

function contribution(max_poll, weight_vec) {
  var weight_exp_sum = 0;
  for (var i = 0; i < weight_vec.length; i++) {
    weight_exp_sum += Math.exp(weight_vec[i]);
  }

  var res = [];
  var ptr = 0;
  for (var i = 0; i < max_poll.length; i++) { // 3
    res[i] = []
    for (var j = 0; j < max_poll[i].length; j++) { // 100
      res[i][j] = Math.exp(weight_vec[ptr])/weight_exp_sum;
      ptr++;
    }
  }

  return res;
}

function analyze(query, max_poll_all, max_poll, fc1_res, output, interested_weight_vec) {
  // init
  var res = Array(query.length);
  for (var i = 0; i < query.length; i++) {
    res[i] = 0;
  }
  // get weights
  var cont = contribution(max_poll, interested_weight_vec) // [ [100],[100],[100] ]
  var matchedIndex = filter_max_index(max_poll_all);
  var matchedWeight = filter_max_weight(max_poll_all);

  for (var i = 0; i < matchedIndex.length; i++) { // 3
    for (var j = 0; j < matchedIndex[i].length; j++) {  // 100
      var idx = matchedIndex[i][j];
      if (i == 0) {
        idx -= 2;
      } else if (i == 1) {
        idx -= 3;
      } else {
        idx -= 4;
      }
      var w = matchedWeight[i][j];
      var dim = i+3;
      for (var k = 0; k < dim; k++) {
        if (idx+k < 0 || idx+k >= query.length) {
          continue;
        }
        res[idx+k] += w*cont[i][j];
      }
    }
  }
  //console.log(query);
  //console.log(res)
  //console.log(soft_max(res));
  return soft_max(res);
}

function get_highest_prob(input) {
  var max = input[0][0];
  var idx = 0;
  for (var i = 0; i < input.length; i++) {
    if (input[i] > max) {
      max = input[i][0];
      idx = i;
    }
  }
  return idx;
}

function round_and_fix(num, decimals) {
  var t = Math.pow(10, decimals);
  return (Math.round((num * t) + (decimals>0?1:0)*(Math.sign(num) * (10 / Math.pow(100, decimals)))) / t).toFixed(decimals);
}

function display_conv(label, results, query, weights, bias, weights_fc1, bias_fc1) {
    if (query.length < 5) {
        clean_up();
        return;
    }
    var L = [-1, 2, 3, 1, 4, 0];
    var input = build_input(results);
    var conv_res = conv(input, weights, bias);

    var args, polling_res;
    var max_poll_res = max_polling(conv_res); // [args, polling_res]
    // console.log(max_poll_res[0][1]) -> max polling res of 3 dim filter, 100 max values
    // console.log(args);
    var max_poll_res_real = [max_poll_res[0][1], max_poll_res[1][1], max_poll_res[2][1]];

    var fc1_res = fc1(max_poll_res_real, weights_fc1, bias_fc1);

    var output = soft_max(fc1_res);

    var res_index = get_highest_prob(output);
    var interested_weight_vec = weights_fc1[res_index];

    var predictedLabel = L[res_index];
    // console.log(output)
    // show_gradient_indicator();

    var ww = analyze(query, max_poll_res, max_poll_res_real, fc1_res, output, interested_weight_vec);
    //console.log(ww)
    var highlight = [];
    for (var i = 0; i < query.length; i++) {
      highlight[highlight.length] = [query[i], ww[i]];
    }
    highlight[highlight.length] = ['\n', 0];

    display_ww(highlight, label, predictedLabel);

    return output;
}
