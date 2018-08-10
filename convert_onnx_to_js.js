const fs = require('fs');
const protobuf = require('protobufjs');

function reshape(buf, shape) {

  function recurse(level, start, end) {
    var array = [];
    if (level === shape.length - 1) {
      for (var i = start; i < end; i += 4) {
        // Protobuf always uses little endian
        array.push(buf.readFloatLE(i));
      }
      return array;
    }

    var slice_size = (end - start) / shape[level];
    for (var i = 0; i < shape[level]; i++) {
      var subarray = recurse(level + 1, start + i*slice_size, start + (i+1)*slice_size);
      array.push(subarray);
    }
    return array;
  }

  return recurse(0, 0, buf.length);
}

fs.readFile('onnx/kimcnn_static.onnx', function(err, data) {
  protobuf.load('onnx/onnx.in.proto', function(err, root) {
    const ModelProto = root.lookupType('onnx.ModelProto');
    const model = ModelProto.decode(data);
    const initializers = model.graph.initializer;
    let embedding, conv3_weights, conv3_biases, conv4_weights, conv4_biases, conv5_weights, conv5_biases, fc_weights, fc_biases;
    [embedding, conv3_weights, conv3_biases, conv4_weights, conv4_biases, conv5_weights, conv5_biases, fc_weights, fc_biases] = initializers;

    conv3_weights = reshape(conv3_weights.rawData, [100, 3, 300]);
    conv3_biases = reshape(conv3_biases.rawData, [100]);
    conv4_weights = reshape(conv4_weights.rawData, [100, 4, 300]);
    conv4_biases = reshape(conv4_biases.rawData, [100]);
    conv5_weights = reshape(conv5_weights.rawData, [100, 5, 300]);
    conv5_biases = reshape(conv5_biases.rawData, [100]);
    fc_weights = reshape(fc_weights.rawData, [5, 300]);
    fc_biases = reshape(fc_biases.rawData, [5]);

    let model_params = {
      conv3_weights: conv3_weights,
      conv3_biases: conv3_biases,
      conv4_weights: conv4_weights,
      conv4_biases: conv4_biases,
      conv5_weights: conv5_weights,
      conv5_biases: conv5_biases,
      fc_weights: fc_weights,
      fc_biases: fc_biases
    };

    // Not using JSON because Chrome doesn't allow reading local JSON files by default
    fs.writeFile('parameters/model_parameters.js', 'var model_params = ' + JSON.stringify(model_params), 'utf8', (err) => {
      if (err) throw err;
      console.log('Saved model parameters file!');
    });
  });
});
