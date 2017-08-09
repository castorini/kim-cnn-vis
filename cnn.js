// used for node.js
// var nj = require('numjs');

var vector_length = 50;

// build an input matrix for CNN
function build_input(results, searcher) {  
    // range from [0.0, 1.0).
    
    var ret = results.map(function (result, i) {
        if (result[1].length <= 0) { // the word is not a top10k one
            // narraw random values down into range (-.25, .25]
            rmatrix = [];
            for (i = 0; i < vector_length; i++) { 
                rmatrix.push((Math.random()-0.5)/2);
            }
            return rmatrix;
        }

        return result[1];
    });

    return ret;
}

function conv(input, filters) {
    return filters.map((filter) => nj.convolve(input, filter));
}

// input is an array of nj.array; return a nj.array of max polling after tanh
function max_polling(input) {
    return input.map((a) => nj.tanh(a).max());
}

// y = w z + b;
function fully_connected(w, z, b) {
    return nj.softmax(nj.add(nj.dot(w,z),b));
}

function whole_procedure(str) {
    var input = build_input(str);
    var conv_res = conv(input, filters);
    var polling_res = max_polling(conv_ret);
    return fully_connected(w, polling_res, b);
}

/*
//nj.convolve()
//build_input("hello world!");
*/

var a = nj.array([[1,2],[4,5]]);
var b = nj.array([[1,2],[4,5]]);
var c = nj.array([[1,2],[4,5]]);
max_polling([a,b,c]);
//var w = nj.array([[1,2,2,3],[3,4,4,5]]);
//var z = nj.array([[1],[2],[3],[4]]);
//var b = nj.array([[1],[2]]); 
//fully_connected(w,z,b);