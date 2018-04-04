
function draw_heatmap(query, highlight, mp) {

  var data_values = [];
  var data_labels = [];
  highlight[0].forEach(function(item){
    data_values.push([item]);
    data_labels.push('');
  });

  var data = {
    values: data_values,
    labels: data_labels
  };

  $("#Matrix").empty();
  drawMatrix(data);

  data_values = [];
  data_labels = [];
  highlight[1].forEach(function(item){
    data_values.push([item]);
    data_labels.push('');
  });

  var data = {
    values: data_values,
    labels: data_labels
  };

  drawMatrix(data);

  data_values = [];
  data_labels = [];
  highlight[2].forEach(function(item){
    data_values.push([item]);
    data_labels.push('');
  });

  var data = {
    values: data_values,
    labels: data_labels
  };
  drawMatrix(data);
}

function drawMatrix(data){
     // Set the dimensions of the canvas / graph
    var	margin = {top: 40, right: 10, bottom: 50, left: 10};
    var height = 400 - margin.top - margin.bottom;

    var chart_options = {
        container: "#Matrix",
        width: 80,  // document.getElementById("container").offsetWidth*0.3 - margin.left - margin.right
        height: height/2,
        margin: margin,
        show_labels : false,
        start_color : "#efefef",
        end_color : "#3498db",
        highlight_cell_on_hover: true,
        highlight_cell_color: "#9b59b6"
    };

    Matrix(data, chart_options);
}
