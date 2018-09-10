const VECTOR_LENGTH = 300;
var batch_size = 32;  // default

/**
 * Convert word vectors to sentence embedding
 * @param wordvecs - a list of dictionaries, each dictionary stores the word and word vector at the index
 * @returns Sentence embedding - matrix of sent length x VECTOR_LENGTH
 */
function buildSentenceEmbedding(results) {
  var ret = results.map(function (result) {
    if (!result.word_vector) { // the word is not a top10k one
      // narrow random values down into range (-.25, .25]
      var rmatrix = [];
      for (i = 0; i < VECTOR_LENGTH; i++) {
        //rmatrix.push((Math.random()-0.5)/2);
        rmatrix.push(0);
      }
      return rmatrix;
    }

    return result.word_vector;
  });

  return ret;
}

/**
 * Perform convolution
 * @param input - Sentence embedding - matrix of sent length x VECTOR_LENGTH
 * @param weights
 * @param bias
 * @param len
 * @param batchSize - batch size
 * @returns {Array} - convolutional feature map
 */
function conv(input, weights, bias, len, batchSize) {
  var featureMaps = [];
  var inTensor = tf.tensor(input).as4D(batchSize, len, 300, 1);

  for (var i = 0; i < weights.length; i++) {  // Loop over once for each filter width (3, 4, 5)
    featureMaps[i] = [];

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

    var inFilter = tf.tensor(temp).as4D(i+3, 300, 1, 100);
    var stride = 1;
    var pad = 'valid';

    featureMaps[i] = tf.conv2d(inTensor, inFilter, stride, pad);
    var bt = tf.tensor(bias[i]).as1D();
    var height = featureMaps[i].shape[1];
    var stackedBias = [];
    while (height > 0) {
      stackedBias[stackedBias.length] = bt;
      height--;
    }
    stackedBias = tf.stack(stackedBias);
    featureMaps[i].add(stackedBias);

    featureMaps[i].relu();
  }

  return featureMaps;
}

function maxPooling(input) {
  var res = [];
  for (var i = 0; i < input.length; i++) {  // 3
    res[i] = [input[i].argMax(1), input[i].max(1)];
  }
  // res shape = 3*100
  return res;
}

function fc1(input, weights, bias, batchSize) {
  // max pooling result
  // input: [t(100), t(100), t(100)]
  // correct
  // [t(100x100), t(100x100), t(100x100)]
  var combined = tf.concat(input, 0).as2D(300, batchSize);
  var w_tensor = tf.tensor(weights);
  var mm = tf.matMul(w_tensor, combined).as2D(5, batchSize);

  var b_tensor = tf.tensor(bias).as2D(5, 1);
  var width = batchSize;
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
function softmax(z) {
  return tf.softmax(z.transpose()); //[100x6]
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

function getConvFeatureMaps(wordvecs, weights, bias, max_len) {
  var sentenceEmbedding = buildSentenceEmbedding(wordvecs);
  var featureMaps = conv(sentenceEmbedding, weights, bias, max_len, 1);
  return featureMaps;
}

function displayBatchConv(batchSize, inputs, modelParams, ignore, test) {
    if (inputs[0].embedding.length < 5) {
        cleanUp();
        return;
    }

    var startTime = window.performance.now();
    var L = [0, 1, 2, 3, 4];
    var batchEmbedding = inputs.map(x => x.embedding);
    var convFeatureMaps = conv(batchEmbedding, modelParams.weights, modelParams.bias, inputs[0].embedding.length, batchSize);
    var maxPoolPosAndVal = maxPooling(convFeatureMaps); // [args, pooling_res]
    var maxPoolVal = [maxPoolPosAndVal[0][1], maxPoolPosAndVal[1][1], maxPoolPosAndVal[2][1]];
    var hiddenLayerOutput = fc1(maxPoolVal, modelParams.fc_weights, modelParams.fc_bias, batchSize);  // longest time
    var output = softmax(hiddenLayerOutput);
    var maxClassIndex = tf.argMax(output, 1).dataSync(); //TODO: change to data(), return promise
    var lapsed = (window.performance.now() - startTime);

    if (test) {
      return lapsed;
    }

    var ret = [];
    for (var i = 0; i < batchSize; i++) {
      var predictedLabel = L[maxClassIndex[i]];
      var ww = analyze(inputs[i].tokenized_query, maxPoolPosAndVal, maxPoolVal, modelParams.fc_weights[maxClassIndex[i]], ignore);

      var highlight = [];
      for (var j = 0; j < inputs[i].tokenized_query.length; j++) {
        highlight.push([inputs[i].tokenized_query[j], ww[j]]);
      }
      highlight.push(['\n', 0]);

      var dim1 = [tf.squeeze(maxPoolPosAndVal[0][0]).slice([i, 0], [1, 100]).dataSync(), tf.squeeze(maxPoolPosAndVal[0][1]).slice([i, 0], [1, 100]).dataSync()];
      var dim2 = [tf.squeeze(maxPoolPosAndVal[1][0]).slice([i, 0], [1, 100]).dataSync(), tf.squeeze(maxPoolPosAndVal[1][1]).slice([i, 0], [1, 100]).dataSync()];
      var dim3 = [tf.squeeze(maxPoolPosAndVal[2][0]).slice([i, 0], [1, 100]).dataSync(), tf.squeeze(maxPoolPosAndVal[2][1]).slice([i, 0], [1, 100]).dataSync()];

      ret.push({
        highlight: highlight,
        label: inputs[i].label,
        prediction: predictedLabel,
        max_pool_res: [dim1, dim2, dim3] // [[2],[2],[2]]
      });
    }

    return ret;
}

function displaySingleConv(wordvecs, query, modelParams, test) {
    if (query.length < 5) {
        cleanUp();
        return;
    }

    var startTime = window.performance.now();
    var L = [0, 1, 2, 3, 4];
    var batchSize = 1;
    // convFeatureMaps is [w3 feat maps, w4 feat maps, w5 feat maps]
    var convFeatureMaps = getConvFeatureMaps(wordvecs, modelParams.weights, modelParams.bias, wordvecs.length);

    var maxPoolPosAndVal = maxPooling(convFeatureMaps); // list of 3 items of [args, max_values]
    // console.log(maxPoolPosAndVal[0][1]) -> max pooling res of 3 dim filter, 100 max values
    var maxPoolVal = [maxPoolPosAndVal[0][1], maxPoolPosAndVal[1][1], maxPoolPosAndVal[2][1]];

    var hiddenLayerOutput = fc1(maxPoolVal, modelParams.fc_weights, modelParams.fc_bias, batchSize);
    var output = softmax(hiddenLayerOutput);

    var maxClassIndex = tf.argMax(output, 1).dataSync();
    var lapsed = (window.performance.now() - startTime);

    if (test) {
      return lapsed;
    }

    var predictedLabel = L[maxClassIndex];
    var queryString = query.join(' ');
    var actualLabel = sampleInputs.find(d => d.sentence === queryString).label;

    $('#inference-result').html(`Predicted: ${predictedLabel} \t Actual: ${actualLabel}`);
}

function display_sentence_coloring(highlight, label, predictedlabel, start, areSame, bias) {
  display_ww(highlight, label, predictedlabel, start, areSame, bias);
}

/**
 *
 * @param wordvecs - a list of dictionaries, each dictionary stores the word and word vector at the index
 * @param query - tokenized sentence as list of tokens
 * @param modelData - object containing model parameters and dev dataset
 */
function allFeatureActivations(wordvecs, query, modelData) {
  // for each width (3, 4, 5)
  // word to weight, word to filter#s

  if (query.length < 5) {
      cleanUp();
      return;
  }
  var convFeatureMaps = getConvFeatureMaps(wordvecs, modelData.weights, modelData.bias, wordvecs.length);
  var maxPoolPosAndVal = maxPooling(convFeatureMaps); // [args, vals]
  var windowWeights = analyzeSepWidth(query, maxPoolPosAndVal);

  drawHeatmap(query, windowWeights);
}
