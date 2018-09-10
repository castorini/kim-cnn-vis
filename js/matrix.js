/*

@author: Arpit Narechania
@email: arpitnarechania@gmail.com
@project: d3-matrix

Copyright (c) 2017 Arpit Narechania

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
OR OTHER DEALINGS IN THE SOFTWARE.

*/

function Matrix(data, options) {
  var words = ["'s", "exceptional", "performances"];
  var margin = options.margin,
      width = options.width,
      height = options.height,
      container = options.container,
      showLabels = options.show_labels,
      startColor = options.start_color,
      endColor = options.end_color,
      highlightCellOnHover = options.highlight_cell_on_hover,
      highlightCellColor = options.highlight_cell_color;

  var dataValues = data['values'];
  var dataLabels = data['labels'];

  if (!dataValues) {
    throw new Error('data is empty');
  }

  if (!Array.isArray(dataValues) || !dataValues.length || !Array.isArray(dataValues[0])) {
    throw new Error('2-D array expected');
  }

  var maxValue = d3.max(dataValues, function(layer) { return d3.max(layer, function(d) { return d; }); });
  var minValue = d3.min(dataValues, function(layer) { return d3.min(layer, function(d) { return d; }); });

  var numrows = dataValues.length;
  var numcols = dataValues[0].length;

  var svg = d3.select(container).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var background = svg.append("rect")
    .attr("width", width)
    .attr("height", height);

  var x = d3.scale.ordinal()
    .domain(d3.range(numcols))
    .rangeBands([0, width]);

  var y = d3.scale.ordinal()
    .domain(d3.range(numrows))
    .rangeBands([0, height]);

  var colorMap = d3.scale.linear()
    .domain([minValue,maxValue])
    .range([startColor, endColor]);

  var row = svg.selectAll(".row")
    .data(dataValues)
    .enter().append("g")
    .attr("class", "row")
    .attr("transform", function(d, i) { return "translate(0," + y(i) + ")"; });

  var cell;
  if (showLabels) {
    cell = row.selectAll(".cell")
      .data(function(d, i) { return dataLabels[i]; })
      .enter().append("g")
      .attr("class", "cell")
      .attr("transform", function(d, i) { return "translate(" + i*height + ", 0)"; });

    cell.append('rect')
      .attr("width", x.rangeBand())
      .attr("height", y.rangeBand()+1);

    cell.append("text")
      .attr("dy", ".32em")
      .attr("x", x.rangeBand() / 2)
      .attr("y", y.rangeBand() / 2)
      .attr("text-anchor", "middle")
      .style("fill", function(d) {
        for (var i = 0; i < words.length; i++) {
          if (d.localeCompare(words[i]) == 0) {
            if (words[i].localeCompare("'s") == 0) {
              words.splice(i, 1);
            }
            return "black";
          }
        }
        return "#C0C0C0";
       })
      .style("font-weight", function(d) {
        for (var i = 0; i < words.length; i++) {
          if (d.localeCompare(words[i]) == 0) {
            if (words[i].localeCompare("'s") == 0) {
              words.splice(i, 1);
            }
            return "900";
          }
        }
        return "";
       })
      .text(function(d, i) { return d; });
  } else {
    cell = row.selectAll(".cell")
      .data(function(d, i) { return d; })
      .enter().append("g")
      .attr("class", "cell")
      .attr("transform", function(d, i) { return "translate(" + x(i) + ", 0)"; });

    cell.append('rect')
      .attr("width", x.rangeBand())
      .attr("height", y.rangeBand()+1);
  }

  row.selectAll(".cell")
    .data(function(d, i) { return dataValues[i]; })
    .style("fill", colorMap);

  if (highlightCellOnHover) {
    cell
    .on("mouseover", function(d, i) {
      d3.select(this).style("transform", "scale(1.1,1.1)").style("transform-origin", "25% 25%");
    })
    .on("mouseout", function() {
      d3.select(this).style("transform", "scale(1.0,1.0)").style("transform-origin", "25% 25%");
    });
  }
}
