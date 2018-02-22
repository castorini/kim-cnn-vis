
// used for node.js
// var nj = require('numjs');

const VECTOR_LENGTH = 300;

var filtersExample = [[[0.01, 0.02],[0.03, 0.04],[0.05, 0.06]],
                [[-0.15,0.16],[0.2, -0.21],[-0.25,0.26],[0.3, -0.31]],
                [[0.23,0.24],[0.25, -0.2],[0.33,0.34],[0.15, -0.1],[0.43,0.44]]];
var batch_size = 32;

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

function conv(input, weights, bias, len) {
  //dl.squeeze(dl.conv1d(dl.tensor(input[0]).as2D(300, 1), dl.tensor(weights[0][0][2]).as3D(300,1,1), 1, 'valid')).print();
  var result = [];
  var in_tensor = dl.tensor(input).as4D(batch_size, len, 300, 1);

  var in_tensor_with_pad = in_tensor;
  var pads = [dl.zeros([2, 300, 1]), dl.zeros([3, 300, 1]), dl.zeros([4, 300, 1])];

  for (var i = 0; i < weights.length; i++) {  // 3
    result[i] = [];
    var in_filter = dl.tensor(weights[i]).as4D(i+3, 300, 1, 100);

    var stride = 1;
    var pad = 'valid';
    //in_tensor_with_pad = dl.concat([pads[i], in_tensor, pads[i]]);

    var bt = dl.tensor(bias[i]).as1D();

    result[i] = dl.squeeze(dl.conv2d(in_tensor, in_filter, stride, pad));
    //result[i][j].add(bt);
    result[i].relu();
  }

  return result;
}

function max_polling(input, ignore) {
  var res = [];
  for (var i = 0; i < input.length; i++) {  // 3
    res[i] = max_polling_helper(input[i]);
  }
  // res shape = 3*2*100
  return res;
}

function max_polling_helper(input) {
  var axis = 1;
  return [input.argMax(axis), input.max(axis)]; // 100*100
}

function fc1(input, weights, bias) {
  // max polling result
  // input: [t(100), t(100), t(100)]
  // correct
  // [t(100x100), t(100x100), t(100x100)]

  var combined = dl.concat(input, 0).as2D(batch_size, 300).transpose();  // 300x100
  var w_tensor = dl.tensor(weights).as2D(6, 300);
  var mm = dl.matMul(w_tensor, combined).as2D(6, batch_size);

  var b_tensor = dl.tensor1d(bias)
  //var res = dl.add(mm, b_tensor);
  return mm;
}

// y = w z + b;
function soft_max(z) {
  return dl.softmax(z.transpose()); //[100x6]
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
  for (var dim = 0; dim < 3; dim++) { // 3
    res[dim] = [];
    var cur = max_poll[dim][0].dataSync();
    for (var c = 0; c < 100; c++) { // 100
      res[dim][c] = cur[c];
    }
  }
  return res;
}

function filter_max_index_non_tensor(max_poll) {
  var res = [];
  for (var dim = 0; dim < 3; dim++) { // 3
    res[dim] = [];
    var cur = max_poll[dim][0];
    for (var c = 0; c < 100; c++) { // 100
      res[dim][c] = cur[c];
    }
  }
  return res;
}

function filter_max_weight(max_poll) {
  var res = [];
  for (var dim = 0; dim < 3; dim++) { // 3
    res[dim] = [];
    var cur = max_poll[dim][0].dataSync();
    for (var c = 0; c < 100; c++) { // 100
      res[dim][c] = cur[c];
    }
  }
  return res;
}

function contribution(max_poll, weight_vec, bias) {
  var weight_exp_sum = 0;
  for (var i = 0; i < weight_vec.length; i++) {
    weight_exp_sum += Math.exp(weight_vec[i]);
  }
  weight_exp_sum += Math.exp(bias);

  var res = [];
  var ptr = 0;
  for (var i = 0; i < 3; i++) { // 3
    res[i] = []
    for (var j = 0; j < 100; j++) { // 100
      res[i][j] = Math.exp(weight_vec[ptr])/weight_exp_sum;
      ptr++;
    }
  }

  return res;
}

function analyze(query, max_poll_all, max_poll, fc1_res, output, interested_weight_vec, fc1_bias, ignore) {
  // init
  var res = Array(query.length);
  for (var i = 0; i < query.length; i++) {
    res[i] = 0;
  }
  // get weights
  var cont = contribution(max_poll, interested_weight_vec, fc1_bias) // [ [100],[100],[100] ]
  var matchedIndex = filter_max_index(max_poll_all);
  var matchedWeight = filter_max_weight(max_poll_all);

  var resByFilter = []; // 3*100

  for (var i = 0; i < matchedIndex.length; i++) { // 3
    resByFilter[i] = [];
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
      if (ignore) {
        if (w <= 0.05 && w >= -0.05) {
          continue;
        }
      }
      var dim = i+3;
      for (var k = 0; k < dim; k++) {
        if (idx+k < 0 || idx+k >= query.length) {
          continue;
        }
        res[idx+k] += w*cont[i][j];
      }
    }
  }

  return res;
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

function get_conv_res(results, weights, bias, max_len) {
  var input = build_input(results);
  var conv_res = conv(input, weights, bias, max_len);
  return conv_res;
}

function display_conv(label, results, query, weights, bias, weights_fc1, bias_fc1, ignore) {
    if (query.length < 5) {
        clean_up();
        return;
    }

    var L = [-1, 2, 3, 1, 4, 0];

    var conv_res = get_conv_res(results, weights, bias);

    var args, polling_res;
    var max_poll_res = max_polling(conv_res, ignore); // [args, polling_res]

    var max_poll_res_real = [max_poll_res[0][1], max_poll_res[1][1], max_poll_res[2][1]];

    var fc1_res = fc1(max_poll_res_real, weights_fc1, bias_fc1);

    var output = soft_max(fc1_res);

    var res_index = dl.argMax(output).dataSync(); //TODO: change to data(), return promise

    var interested_weight_vec = weights_fc1[res_index];

    var predictedLabel = L[res_index];
    // console.log(output);
    // show_gradient_indicator();

    var ww = analyze(query, max_poll_res, max_poll_res_real, fc1_res, output,
                    interested_weight_vec, bias_fc1[res_index], ignore);
    //console.log(ww)
    var ret = [];
    var highlight = [];
    for (var i = 0; i < query.length; i++) {
      highlight[highlight.length] = [query[i], ww[i]];
    }
    highlight[highlight.length] = ['\n', 0];
/*
    var conv_res_data = []
    for (var i = 0; i < 3; i++) {
      conv_res_data[i] = conv_res[i].dataSync();
    }
    var max_poll_res_data = []
    for (var i = 0; i < 3; i++) {
      max_poll_res_data[i] = [];
      max_poll_res_data[i][0] = max_poll_res[i][0].dataSync();
      max_poll_res_data[i][1] = max_poll_res[i][1].dataSync();
    }*/
    ret[0] = [highlight, label, predictedLabel];
    ret[1] = conv_res; // [700, 800, 900]
    ret[2] = max_poll_res; // [[2],[2],[2]]

    //display_ww(highlight, label, predictedLabel);

    return ret;
}

function display_conv_batch(batch, max_len, label, results, query, weights, bias, weights_fc1, bias_fc1, ignore) {
    if (query.length < 5) {
        clean_up();
        return;
    }

    var startTime = window.performance.now();
    var L = [-1, 2, 3, 1, 4, 0];
    var conv_res = conv(results, weights, bias, max_len);

    var args, polling_res;
    var max_poll_res = max_polling(conv_res, ignore); // [args, polling_res]

    var max_poll_res_real = [max_poll_res[0][1], max_poll_res[1][1], max_poll_res[2][1]];

    var fc1_res = fc1(max_poll_res_real, weights_fc1, bias_fc1);  // longest time

    var output = soft_max(fc1_res);
    // size 100
    var res_index = dl.argMax(output, 1).dataSync(); //TODO: change to data(), return promise
    var lapsed = (window.performance.now() - startTime);


    return lapsed;
}

function display_single_conv(results, query, weights, bias, weights_fc1, bias_fc1) {
    if (query.length < 5) {
        clean_up();
        return;
    }
    var L = [-1, 2, 3, 1, 4, 0];
    var conv_res = get_conv_res(results, weights, bias);
    var startTime = window.performance.now();
    console.log((window.performance.now() - startTime));
    var args, polling_res;
    var max_poll_res = max_polling(conv_res); // [args, polling_res]
    // console.log(max_poll_res[0][1]) -> max polling res of 3 dim filter, 100 max values
    // console.log(args);
    console.log((window.performance.now() - startTime));
    var max_poll_res_real = [max_poll_res[0][1], max_poll_res[1][1], max_poll_res[2][1]];

    var fc1_res = fc1(max_poll_res_real, weights_fc1, bias_fc1);
    console.log((window.performance.now() - startTime));
    var output = soft_max(fc1_res);
    console.log((window.performance.now() - startTime));
    var res_index = get_highest_prob(output);
    var interested_weight_vec = weights_fc1[res_index];
    console.log((window.performance.now() - startTime));
    var predictedLabel = L[res_index];
    // console.log(output)
    // show_gradient_indicator();

    var ww = analyze(query, max_poll_res, max_poll_res_real, fc1_res, output,
                    interested_weight_vec, bias_fc1[res_index]);
    //console.log(ww)

    console.log((window.performance.now() - startTime));
    var highlight = [];
    for (var i = 0; i < query.length; i++) {
      highlight[highlight.length] = [query[i], ww[i]];
    }
    highlight[highlight.length] = ['\n', 0];

    display_ww(highlight, -1, predictedLabel, [-1, -1], false, -1);
    console.log((window.performance.now() - startTime));
}

function display_sentence_coloring(highlight, label, predictedLabel, start, areSame, bias) {
  display_ww(highlight, label, predictedLabel, start, areSame, bias);
}
