## Kim CNN visualization

Demonstration of in-browser neural network inference on [Kim CNN](https://arxiv.org/abs/1408.5882) in the browser.
See an online demo of a previous version at [project homepage](https://yiyun-liang.github.io/kim-cnn-vis/).

**Active code refactoring in-progress (Aug 5, 2018)**

## Setup

First, train the Kim CNN model and export the trained model as an ONNX protobuf.
Do this after cloning and setting up [Castor](https://github.com/castorini/Castor).
Our code is based on PyTorch v0.4 and ONNX release 1.2.2.

For example, you can do this by running the following in the Castor repo:

```
python -m kim_cnn --dataset SST-1 --mode static --lr 0.3213 --weight_decay 0.0002 --dropout 0.4 --onnx
```

Copy the model (`kimcnn_static.onnx`) into the `onnx` subdirectory.

Install protobuf for Node.js: `npm install protobufjs`.

Run `node convert_onnx_to_js.js` to output a `model_parameters.js` file containing all the model parameters in the `parameters` directory.

### License

Licensed under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).

