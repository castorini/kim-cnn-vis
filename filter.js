const VECTOR_LENGTH = 300;
var batch_size = 32;  // default

/**
 * Convert word vectors to sentence embedding
 * @param wordvecs - [[word, wordvec] ...]
 * @returns Sentence embedding - matrix of sent length x VECTOR_LENGTH
 */
function build_input(results) {
  var ret = results.map(function (result) {
    if (result[1].length === 0) { // the word is not a top10k one
      // narrow random values down into range (-.25, .25]
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

/**
 * Perform convolution
 * @param input - Sentence embedding - matrix of sent length x VECTOR_LENGTH
 * @param weights
 * @param bias
 * @param len
 * @param bs - batch size
 * @returns {Array} - convolutional feature map
 */
function conv(input, weights, bias, len, bs) {
  var result = [];
  bs = bs || batch_size;
  var in_tensor = tf.tensor(input).as4D(bs, len, 300, 1);

  for (var i = 0; i < weights.length; i++) {  // Loop over once for each filter width (3, 4, 5)
    result[i] = [];

    // Reshape input tensor to filter width x VECTOR_LENGTH x # number of filters
    var temp = Array(i+3);
    for (var a = 0; a < i+3; a++) {
      temp[a] = Array(300);
      for (var b = 0; b < 300; b++) {
        temp[a][b] = Array(100);
        for (var c = 0; c < 100; c++) {
          temp[a][b][c] = weights[i][c][a][b];
        }
      }
    }

    var in_filter = tf.tensor(temp).as4D(i+3, 300, 1, 100);
    var stride = 1;
    var pad = 'valid';

    result[i] = tf.conv2d(in_tensor, in_filter, stride, pad);
    var bt = tf.tensor(bias[i]).as1D();
    var height = result[i].shape[1];
    var stacked_bias = [];
    while (height > 0) {
      stacked_bias[stacked_bias.length] = bt;
      height--;
    }
    stacked_bias = tf.stack(stacked_bias);
    result[i].add(stacked_bias);

    result[i].relu();
  }

  return result;
}

function max_pooling(input, ignore) {
  var res = [];
  for (var i = 0; i < input.length; i++) {  // 3
    res[i] = [input[i].argMax(1), input[i].max(1)];
  }
  // res shape = 3*100
  return res;
}

function fc1(input, weights, bias, bs) {
  // max pooling result
  // input: [t(100), t(100), t(100)]
  // correct
  // [t(100x100), t(100x100), t(100x100)]
  bs = bs || batch_size;

  var combined = tf.concat(input, 0).as2D(300, bs);
  var w_tensor = tf.tensor(weights);
  var mm = tf.matMul(w_tensor, combined).as2D(5, bs);

  var b_tensor = tf.tensor(bias).as2D(5, 1);
  var width = bs;
  var concat_bias = b_tensor;
  width--;
  while (width > 0) {
    concat_bias = tf.concat([concat_bias, b_tensor], 1);
    width--;
  }

  mm.add(concat_bias);
  return mm;
}

// y = w z + b;
function soft_max(z) {
  return tf.softmax(z.transpose()); //[100x6]
}

function filter_max_index(max_pool) {
  var res = [];
  for (var dim = 0; dim < 3; dim++) { // 3
    res[dim] = [];
    var cur = max_pool[dim][0].dataSync();
    for (var c = 0; c < 100; c++) { // 100
      res[dim][c] = cur[c];
    }
  }
  return res;
}

function filter_max_index_non_tensor(max_pool) {
  var res = [];
  for (var dim = 0; dim < 3; dim++) { // 3
    res[dim] = [];
    var cur = max_pool[dim][0];
    for (var c = 0; c < 100; c++) { // 100
      res[dim][c] = cur[c];
    }
  }
  return res;
}

function filter_max_weight(max_pool) {
  var res = [];
  for (var dim = 0; dim < 3; dim++) { // 3
    res[dim] = [];
    var cur = max_pool[dim][1].dataSync();
    for (var c = 0; c < 100; c++) { // 100
      res[dim][c] = cur[c];
    }
  }
  return res;
}

function contribution(max_pool, weight_vec, bias) {
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

function analyze(query, max_pool_all, max_pool, fc1_res, output, interested_weight_vec, fc1_bias, ignore) {
  // init
  var res = Array(query.length);
  for (var i = 0; i < query.length; i++) {
    res[i] = 0;
  }
  // get weights
  var cont = contribution(max_pool, interested_weight_vec, fc1_bias) // [ [100],[100],[100] ]

  var matchedIndex = filter_max_index(max_pool_all);
  var matchedWeight = filter_max_weight(max_pool_all);

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

function analyze_sep_width(query, max_pool_all, max_pool, fc1_res, output, interested_weight_vec, fc1_bias, ignore) {
  // init
  var res = Array(query.length);

  var matchedIndex = filter_max_index(max_pool_all);
  var matchedWeight = filter_max_weight(max_pool_all);

  var resByFilter = []; // 3*100
  var mapping = [];

  for (var i = 0; i < matchedIndex.length; i++) { // 3
    resByFilter[i] = [];
    mapping[i] = [];
    for (var k = 0; k < query.length; k++) {
      res[k] = 0;
      mapping[i][k] = 0;
      resByFilter[i][k] = 0;
    }
    for (var j = 0; j < matchedIndex[i].length; j++) {  // 100
      var idx = matchedIndex[i][j];
      var w = matchedWeight[i][j];
      if (ignore) {
        if (w <= 0.05 && w >= -0.05) {
          continue;
        }
      }

      if (idx < 0 || idx >= query.length) {

      } else {
        mapping[i][idx] = Math.max(mapping[i][idx], w);
      }
    }
    for (var k = 0; k < query.length; k++) {
      //resByFilter[i][k] = parseInt(res[k]*100);
      if (k > query.length - (i + 3) + 1) {
        break;
      }
      resByFilter[i][k] = mapping[i][k];
    }
  }

  return [resByFilter, mapping];
}

function get_conv_res(wordvecs, weights, bias, max_len) {
  var sentenceEmbedding = build_input(wordvecs);
  var conv_res = conv(sentenceEmbedding, weights, bias, max_len, 1);
  return conv_res;
}

function display_conv_batch(batch, max_len, label, results, query, weights, bias, weights_fc1, bias_fc1, ignore, test) {
    if (query.length < 5) {
        clean_up();
        return;
    }

    var startTime = window.performance.now();
    var L = [0, 1, 2, 3, 4];
    var conv_res = conv(results, weights, bias, max_len);

    var max_pool_res = max_pooling(conv_res, ignore); // [args, pooling_res]

    var max_pool_res_real = [max_pool_res[0][1], max_pool_res[1][1], max_pool_res[2][1]];

    var fc1_res = fc1(max_pool_res_real, weights_fc1, bias_fc1);  // longest time

    var output = soft_max(fc1_res);
    var res_index = tf.argMax(output, 1).dataSync(); //TODO: change to data(), return promise
    var lapsed = (window.performance.now() - startTime);

    if (test) {
      return lapsed;
    }

    var ret = [];
    for (var i = 0; i < batch_size; i++) {
      var interested_weight_vec = weights_fc1[res_index[i]];

      var predictedlabel = L[res_index[i]];

      var ww = analyze(query[i], max_pool_res, max_pool_res_real, bias_fc1, output,
                      interested_weight_vec, bias_fc1[res_index[i]], ignore);

      var highlight = [];
      for (var j = 0; j < query[i].length; j++) {
        highlight[highlight.length] = [query[i][j], ww[j]];
      }
      highlight[highlight.length] = ['\n', 0];
      ret[i] = [];
      ret[i][0] = [highlight, label[i], predictedlabel];
      ret[i][1] = conv_res; // [700, 800, 900]

      var dim1 = [tf.squeeze(max_pool_res[0][0]).slice([i, 0], [1, 100]).dataSync(), tf.squeeze(max_pool_res[0][1]).slice([i, 0], [1, 100]).dataSync()];
      var dim2 = [tf.squeeze(max_pool_res[1][0]).slice([i, 0], [1, 100]).dataSync(), tf.squeeze(max_pool_res[1][1]).slice([i, 0], [1, 100]).dataSync()];
      var dim3 = [tf.squeeze(max_pool_res[2][0]).slice([i, 0], [1, 100]).dataSync(), tf.squeeze(max_pool_res[2][1]).slice([i, 0], [1, 100]).dataSync()];
      ret[i][2] = [dim1, dim2, dim3]; // [[2],[2],[2]]
    }

    return ret;
}

function display_single_conv(wordvecs, query, weights, bias, weights_fc1, bias_fc1, test) {

    if (query.length < 5) {
        clean_up();
        return;
    }

    var startTime = window.performance.now();
    var L = [0, 1, 2, 3, 4];
    var batch_size = 1;
    var conv_res = get_conv_res(wordvecs, weights, bias, wordvecs.length);
    // conv_res is [w3 feat maps, w4 feat maps, w5 feat maps]

    var max_pool_res = max_pooling(conv_res); // list of 3 items of [args, max_values]

    // console.log(max_pool_res[0][1]) -> max pooling res of 3 dim filter, 100 max values
    var max_pool_res_real = [max_pool_res[0][1], max_pool_res[1][1], max_pool_res[2][1]];

    var fc1_res = fc1(max_pool_res_real, weights_fc1, bias_fc1, batch_size);
    var output = soft_max(fc1_res);

    var res_index = tf.argMax(output, 1).dataSync();
    var lapsed = (window.performance.now() - startTime);

    if (test) {
      return lapsed;
    }

    var predictedlabel = L[res_index];
    var queryString = query.join(' ');
    var actuallabel = sampleInputs.find(d => d.sentence === queryString).label;

    $('#inference-result').html(`Predicted: ${predictedlabel} \t Actual: ${actuallabel}`);
}

function display_sentence_coloring(highlight, label, predictedlabel, start, areSame, bias) {
  display_ww(highlight, label, predictedlabel, start, areSame, bias);
}

/**
 *
 * @param wordvecs - [[word, wordvec] ...]
 * @param query - tokenized sentence as list of tokens
 * @param modelData - object containing model parameters and dev dataset
 */
function all_feature_activations(wordvecs, query, modelData) {
  // for each width (3, 4, 5)
  // word to weight, word to filter#s

  if (query.length < 5) {
      clean_up();
      return;
  }
  var batch_size = 1;
  var conv_res = get_conv_res(wordvecs, modelData.weights, modelData.bias, wordvecs.length);

  var max_pool_res = max_pooling(conv_res); // [args, pooling_res]
  var max_pool_res_real = [max_pool_res[0][1], max_pool_res[1][1], max_pool_res[2][1]];

  var fc1_res = fc1(max_pool_res_real, modelData.fc_weights, modelData.fc_bias, batch_size);
  var output = soft_max(fc1_res);
  var res_index = tf.argMax(output, 1).dataSync();

  var interested_weight_vec = modelData.fc_weights[res_index];

  var vis_res = analyze_sep_width(query, max_pool_res, max_pool_res_real, fc1_res, output,
                  interested_weight_vec, modelData.fc_bias[res_index]);

  var ww = vis_res[0];
  var mp = vis_res[1];

  draw_heatmap(query, ww, mp);
}
