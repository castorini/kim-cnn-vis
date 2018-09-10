function filterMaxIndex(maxPoolPosAndVal) {
  var res = [];
  for (var dim = 0; dim < 3; dim++) {
    res.push(maxPoolPosAndVal[dim][0].reshape([100]).dataSync());
  }
  return res;
}

function filterMaxWeight(maxPoolPosAndVal) {
  var res = [];
  for (var dim = 0; dim < 3; dim++) {
    res.push(maxPoolPosAndVal[dim][1].reshape([100]).dataSync());
  }
  return res;
}

/**
 * Get "contribution" of each feature map towards the prediction of a class
 * @param maxPoolVal - output values of max pooling
 * @param weightVec - a vector whose length is equal to the number of feature maps
 * @returns {Array} denoting the "contribution" of each feature map
 */
function contribution(maxPoolVal, weightVec) {
  var normalizingDenominator = 0;
  for (var i = 0; i < weightVec.length; i++) {
    normalizingDenominator += Math.exp(weightVec[i]);
  }

  var res = [];
  for (var i = 0; i < 3; i++) { // 3
    res[i] = [];
    for (var j = 0; j < 100; j++) { // 100
      res[i][j] = Math.exp(weightVec[i*100+j]) / normalizingDenominator;
    }
  }

  return res;
}

function analyze(tokenizedQuery, maxPoolPosAndVal, maxPoolVal, interestedWeightVec, ignore) {
  // init
  var res = Array(tokenizedQuery.length).fill(0);

  // get weights
  var cont = contribution(maxPoolVal, interestedWeightVec); // [ [100],[100],[100] ]

  var matchedIndex = filterMaxIndex(maxPoolPosAndVal);
  var matchedWeight = filterMaxWeight(maxPoolPosAndVal);

  for (var i = 0; i < matchedIndex.length; i++) { // 3
    for (var j = 0; j < matchedIndex[i].length; j++) {  // 100
      var idx = matchedIndex[i][j];
      if (i === 0) {
        idx -= 2;
      } else if (i === 1) {
        idx -= 3;
      } else {
        idx -= 4;
      }
      var w = matchedWeight[i][j];
      if (ignore && w <= 0.05 && w >= -0.05) {
        continue;
      }
      var dim = i+3;
      for (var k = 0; k < dim; k++) {
        if (idx+k < 0 || idx+k >= tokenizedQuery.length) {
          continue;
        }
        res[idx+k] += w*cont[i][j];
      }
    }
  }

  return res;
}

function analyzeSepWidth(query, maxPoolPosAndVal, ignore) {
  var matchedIndex = filterMaxIndex(maxPoolPosAndVal);
  var matchedWeight = filterMaxWeight(maxPoolPosAndVal);

  var tokenWeights = []; // 3 * length of query

  for (var i = 0; i < matchedIndex.length; i++) { // 3
    tokenWeights[i] = [];
    for (var k = 0; k < query.length; k++) {
      tokenWeights[i][k] = 0;
    }
    for (var j = 0; j < matchedIndex[i].length; j++) {  // 100
      var idx = matchedIndex[i][j];
      var w = matchedWeight[i][j];
      if (ignore || Math.abs(w) <= 0.05) continue;

      // Set the weight of all tokens in the window to the max weight
      for (var offset = 0; offset < 3 + i; offset++) {
        var tokenIdx = idx + offset;
        if (tokenIdx >= 0 && tokenIdx < query.length) {
          tokenWeights[i][tokenIdx] = Math.max(tokenWeights[i][tokenIdx], w);
        }
      }
    }
  }

  return tokenWeights;
}
