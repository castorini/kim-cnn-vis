
function draw_heatmap(query, highlight, mp) {

  $("#Matrix").empty();

  var data_values = [];
  var data_labels = [];
  for (var i = 0; i < query.length; i++) {
    data_values.push([0]);
    data_labels.push([query[i]]);
  }

  var data = {
    values: data_values,
    labels: data_labels
  };

  drawString(data);

  drawWeight(query.length-2, highlight[0], mp[0]);
  drawWeight(query.length-3, highlight[1], mp[1]);
  drawWeight(query.length-4, highlight[2], mp[2]);
}

function drawWeight(len, input, mp) {
  var data_values = [];
  var data_labels = [];
  input.forEach(function(item){
    data_values.push([item]);
    data_labels.push('');
  });

  var data = {
    values: data_values,
    labels: data_labels
  };
  drawMatrix(data, mp);
}

function drawString(data){
     // Set the dimensions of the canvas / graph
    var	margin = {top: 0, right: 10, bottom: 50, left: 10};

    var len = data.values.length;
    var chart_options = {
        container: "#Matrix",
        width: 80,
        height: len*23,
        margin: margin,
        show_labels : true,
        start_color : "#ffffff",
        end_color : "#3498db",
        highlight_cell_on_hover: false,
        highlight_cell_color: "#9b59b6"
    };

    Matrix(data, undefined, chart_options);
}

function drawMatrix(data, mp){
     // Set the dimensions of the canvas / graph
    var	margin = {top: 0, right: 10, bottom: 50, left: 10};

    var len = data.values.length;
    var chart_options = {
        container: "#Matrix",
        width: 80,  // document.getElementById("container").offsetWidth*0.3 - margin.left - margin.right
        height: len*23,
        margin: margin,
        show_labels : false,
        start_color : "#ffffff",
        end_color : "#3498db",
        highlight_cell_on_hover: true,
        highlight_cell_color: "#D8BFD8"
    };

    Matrix(data, mp, chart_options);
}
