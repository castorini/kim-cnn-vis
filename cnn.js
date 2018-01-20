// used for node.js
// var nj = require('numjs');

const VECTOR_LENGTH = 50;

var filters = [[[0.01, 0.02],[0.03, 0.04]], [[-0.15,0.16],[0.2, -0.21]], [[0.23,0.24],[0.25, -0.2]]];
var w = nj.array([[0.1,0.2,0.3],[-0.04,0.21,0.09],[0.04,-0.11, -0.09]]);
var b = nj.array([[0.1],[0.02],[0.04]]);


// build an input matrix for CNN
function build_input(results) {
    // range from [0.0, 1.0).

    var ret = results.map(function (result) {
        if (result[1].length <= 0) { // the word is not a top10k one
            // narraw random values down into range (-.25, .25]
            rmatrix = [];
            for (i = 0; i < VECTOR_LENGTH; i++) {
                rmatrix.push((Math.random()-0.5)/2);
            }
            return rmatrix;
        }

        return result[1];
    });

    return ret;
}

function conv(input, filters) {
    return filters.map(filter => nj.convolve(input, filter).tolist());
}

function argmax(input) {
    console.log(input);
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

// input is an array of nj.array; return a nj.array of max polling after tanh
function max_polling(input) {
    return [input.map(a => argmax(nj.tanh(a).tolist())),
            input.map(a => [nj.tanh(a).max()])];
}

// y = w z + b;
function fully_connected(w, z, b) {
    console.log(w.shape);
    console.log(nj.array(z).shape);
    return nj.softmax(nj.add(nj.dot(w,z),b)).tolist();
}

function display_cnn(results, query) {
    if (query.length < filters.length) {
        clean_up();
        return;
    }
    var node_dict = {};
    var input = build_input(results);
    var conv_res = conv(input, filters);
    var args, polling_res;
    [args, polling_res] = max_polling(conv_res);
    console.log(args);
    var output = fully_connected(w, polling_res, b);
    show_gradient_indicator();
    show_network(query, input, conv_res, args, polling_res, output);
    return output;
}

/*
x = nj.convolve([[1,2,3,4,5],[4,5,6,7,8]],[[1,2]]);
y = x.tolist();
console.log(y);

build_input("hello world!");

var a = nj.array([[1,2],[4,5]]);
var b = nj.array([[1,2],[4,5]]);
var c = nj.array([[1,2],[4,5]]);
console.log(max_polling([a,b,c]));
*/

//var w = nj.array([[1,2,2,3],[3,4,4,5]]);
//var z = nj.array([[1],[2],[3],[4]]);
//var b = nj.array([[1],[2]]);
//fully_connected(w,z,b);
