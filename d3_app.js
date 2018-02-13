const RECT_SIZE = 15;
const PADDING = RECT_SIZE * 5;

var select_rect = null;
var color_scale = d3.scaleLinear()
                    .domain([-0.25, 0, 0.25])
                    .range(["#f59322", "#e8eaeb", "#0877bd"])
                    .clamp(true);
var coords = [];
var prev_dict = [];
var NUMBER_OF_WORDS;
var NUMBER_OF_FILTERS;
var FILTER_X_SIZE;
var FILTER_Y_SIZE;

function show_gradient_indicator() {
    var svg = d3.select("#colormap");
    svg.selectAll("*").remove();
    var svg_defs = svg.append("defs");
    var gradient = svg_defs.append("linearGradient")
                    .attr("id", "gradient");

    gradient.append("stop")
            .attr("stop-color", "#f59322")
            .attr("offset", 0)
            .attr("stop-opacity", 1);
    gradient.append("stop")
            .attr("stop-color", "#e8eaeb")
            .attr("offset", 0.5)
            .attr("stop-opacity", 1);
    gradient.append("stop")
            .attr("stop-color", "#0877bd")
            .attr("offset", 1)
            .attr("stop-opacity", 1);

    var x = d3.scaleLinear()
        .domain([-0.25, 0.25])
        .range([0,144]);
    var x_axis = d3.axisBottom(x)
        .tickValues([-0.25, 0, 0.25])
        .tickFormat(d3.format("-.2f"));
    var g = svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(10,30)")
        .call(x_axis);
    g.append("rect")
        .attr("y", -7)
        .attr("width", 144)
        .attr("height", 10)
        .attr("fill", "url(#gradient)");
    g.append("text")
        .attr("class", "caption")
        .attr("x", x.range()[0])
        .attr("y", -12)
        .attr("fill", "#000")
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .text("Value");
}

function draw_paths() {
    svg = d3.select("#lines");
    var id = select_rect.attr("id").split(",").map(Number);
    var result = prev_dict[id[0]][id[1]][id[2]][id[3]];
    result.forEach(function(r, idx) {
        var id_str = '[id="'+r[0]+","+r[1]+","+r[2]+","+r[3]+'"]';
        var source = d3.select(id_str);
        source.classed("select", true);
        svg.append("line")
            .style("stroke", "purple")
            .attr("x1", Number(select_rect.attr("x")) + RECT_SIZE / 2)
            .attr("y1", select_rect.attr("y"))
            .attr("x2", Number(source.attr("x")) + RECT_SIZE / 2)
            .attr("y2", Number(source.attr("y")) + RECT_SIZE);
    })
}

function show_source(rect) {
    if (rect == null) {
        d3.selectAll("*").classed("select", false);
        svg = d3.select("#lines");
        svg.selectAll("*").remove();
        return;
    }
    select_rect = d3.select(rect)
                    .classed("select", true);
    draw_paths();
}

function show_rect(vectors, svg, x_offset, y_offset, class_name, index0, index1, words) {
    var rect_y_offset = 0;
    var vector_length = 0;
    if (index0 == 0) {
        var rect_y_offset = RECT_SIZE + nj.max(nj.array(words.map(word => word.length))) * RECT_SIZE / 2;
    }

    vectors.forEach(function(v, idx0) {
        vector_length = v.length > vector_length ? v.length : vector_length;

        var tmp = [];
        var dict_tmp = [];
        // fill rect
        v.forEach(function(entry, idx1) {
            var x = x_offset + idx0*RECT_SIZE;
            var y = y_offset + rect_y_offset + idx1*RECT_SIZE;
            svg.append("g").append("rect")
                .attr("x", x)
                .attr("y", y)
                .attr("width", RECT_SIZE)
                .attr("height", RECT_SIZE)
                .attr("fill", color_scale(entry))
                .attr("id", index0 + "," + index1 + "," + idx0 + "," + idx1)
                .classed(class_name, true)
                .on("mouseenter", function() {
                    show_source(this);
                })
                .on("mouseleave", function() {
                    show_source(null);
                });
            tmp.push([x, y]);
            dict_tmp.push([]);
            });
        coords[index0][index1].push(tmp);
        prev_dict[index0][index1].push(dict_tmp);
        // fill input text
        if (index0 == 0) {
            var text = svg.append("text")
                        .attr("class", "main-label")
                        .attr("x", x_offset + idx0*RECT_SIZE + RECT_SIZE / 2)
                        .attr("y", 0)
                        .attr("text-anchor", "start")
                        .append("tspan")
                        .attr("writing-mode","tb-rl")
                        .attr("font-size", RECT_SIZE)
                        .attr("transform","translate(90)")
                        .text(words[idx0]);
        }
    });

    // adjust svg height
    var new_height = y_offset + rect_y_offset + RECT_SIZE * vector_length;
    svg.attr("height", new_height);
    return new_height;
}

function clean_up() {
    var svg = d3.select("#network");
    svg.selectAll("*").remove();
    coords = [[[]], [[]], [[]], [[]]];
    prev_dict = [[[]], [[]], [[]], [[]]];
}

function build_prev_dict(input, conv_res, args, polling_res, output) {
    // conv
    var dim_inc = 0;
    conv_res.forEach(function(f, idx0) {
        f.forEach(function(v, idx1) {
            v.forEach(function(entry, idx2) {
                var prev = [];
                for (var i = idx1; i < idx1+FILTER_X_SIZE+dim_inc; i++) {
                    for (var j = idx2; j<idx2+FILTER_Y_SIZE; j++) {
                        prev.push([0, 0, i, j]);
                    }
                }
                prev_dict[1][idx0][idx1][idx2] = prev;
            });
        });
        dim_inc++;
    });

    // polling
    polling_res.forEach(function(entry, idx) {
        prev_dict[2][0][idx][0].push([1, idx, args[idx][0], args[idx][1]]);
    })

    // output layer
    var prev = [];
    for (var i = 0; i < polling_res.length; i++) {
        prev.push([2, 0, i, 0]);
    }
    output.forEach(function(entry, idx) {
        prev_dict[3][0][idx][0] = prev;
    })
}

function show_network(words, input, filters, conv_res, args, polling_res, output) {
    // clean up
    clean_up();
    var svg = d3.select("#network");
    var NUMBER_OF_WORDS = words.length;
    var NUMBER_OF_FILTERS = filters.length;
    FILTER_X_SIZE = filters[0].length;
    FILTER_Y_SIZE = nj.array(filters[0]).shape[1];
    CONV_RESULT_WIDTH = NUMBER_OF_WORDS - FILTER_X_SIZE + 1;
    CONV_RESULT_HEIGHT = VECTOR_LENGTH - FILTER_Y_SIZE + 1;
    var height, width;
    var x_offset, new_height;
    width = CONV_RESULT_WIDTH * NUMBER_OF_FILTERS * RECT_SIZE + PADDING * (NUMBER_OF_FILTERS-1);
    // set width
    svg.attr("width", width);

    // show input
    x_offset = (width - (RECT_SIZE * NUMBER_OF_WORDS)) / 2;
    height = show_rect(input, svg, x_offset, 0, "input", 0, 0, words);

    // show convolutional layer
    conv_res.forEach(function(v, idx) {
        x_offset = idx * ((RECT_SIZE * CONV_RESULT_WIDTH) + PADDING);
        coords[1].push([]);
        prev_dict[1].push([]);
        new_height = show_rect(v, svg, x_offset, height + PADDING, "conv_layer", 1, idx);
    });
    height = new_height;

    // show polling
    x_offset = (width-(RECT_SIZE * filters.length))/ 2;
    height = show_rect(polling_res, svg, x_offset, height + PADDING, "polling", 2, 0);

    // show output
    x_offset = (width-(RECT_SIZE * 6))/ 2;  // b.size = 3
    show_rect(output, svg, x_offset, height + PADDING, "output", 3, 0);

    svg.append("g").attr("id", "lines");
    build_prev_dict(input, conv_res, args, polling_res, output);
}


function display_ww(input, label, plabel, start, same, bias) {
    // clean up
    clean_up();

    var div = d3.select(".sentences");
    if (start[0] != -1 && start[1] != -1) {
      var css = "font-size:160%;"
      if (bias == -1) {
        div.append('div')
          .attr('class', 'd')
          .attr('style', css)
          .html("Filter " + start[0] + "-" + start[1]);
      } else if (bias != -1 && same == true){
        div.append('div')
          .attr('class', 'd')
          .attr('style', css)
          .html("Filter " + start[0] + "-" + start[1] + " (bias = " + bias + ")");
      }
      div.append('br');
    }

    var lnew = div.append('div');
    lnew.attr('class', 'd').html(label + "&nbsp;&nbsp;/&nbsp;&nbsp;" + plabel + "&nbsp;&nbsp;");

    render(div, input, plabel, same);
}

function toColor3(v, len, i, label, same) {
  // v is -1 to 1 initially
  if(v > 0) {
    var h = 200;  // negative
    if (label == 2) {
      h = 50; // neutral
    } else if (label == 3 || label == 4) {
      h = 0; // positive
    }
    var s = "60%";
    v = 1 - v;
    v = v * 100;
    var l = 40;
    l += (40/len)*i;
    /*var l = 100;
    if (v > 90) {
      l = 90;
    } else if (v < 10) {
      l = 40;
    } else if (v >= 10 && v < 30) {
      l = 50;
    } else if (v >= 30 && v < 50) {
      l = 60;
    } else if (v >= 50 && v < 70) {
      l = 70;
    } else {
      l = 80;
    }*/
    l += '%';
    if (same) {
      if (v == 0) {
        l = 60;
      } else {
        l = 40;
      }
      l += '%';
    }
  } else {
    var h = 0;
    var s = "60%";
    v = -v;
    v = 1 - v; // invert too
    var l = (v * 100) + '%';
  }
  var s = sprintf('hsl(%d,%s,%s)', h,s,l);
  return s;
}

function sortWithIndeces(toSort) {
  for (var i = 0; i < toSort.length; i++) {
    toSort[i] = [toSort[i], i];
  }
  toSort.sort(function(left, right) {
    return left[0] < right[0] ? 1 : -1;
  });
  toSort.sortIndices = [];

  for (var j = 0; j < toSort.length; j++) {
    toSort.sortIndices[toSort[j][1]] = j-1;
  }
  return toSort;
}


function render(div, data, plabel, same) {
  var len = data.length;
  var new_intensity_arr = [];
  for (var i = 0; i < len; i++) {
    new_intensity_arr[i] = data[i][1];
  }
  var sorted = sortWithIndeces(new_intensity_arr);
  var rank = sorted.sortIndices;

  for (var i = 0; i < len; i++) {
    var word = data[i][0];
    var intensity = data[i][1];

    //console.log(intensity + "," + len + "," + rank[i] + "," + plabel)
    var cole = toColor3(intensity, len, rank[i], plabel, same);

    var css = 'background-color:' + cole;

    if(word == ' ') {
      css += ';color:' + cole;
    }
    if(word == '\n') {
      css += ';display:block;'
      //div.append('br')
    }

    word += "&nbsp;&nbsp;";

    var dnew = div.append('div');
    dnew.attr('class', 'd')
      .attr('style', css)
      .html(word);
  }
}
