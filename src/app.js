const express = require('express');
const fs = require('fs');
const d3 = require('d3');
const jsdom = require("jsdom");

const Canvas = require('canvas');

const app = express();

const parseTime = d3.timeParse("%d-%b-%y");
const data = JSON.parse(fs.readFileSync('./data.json', 'utf8')).map(d => ({
  date: parseTime(d.date),
  close: d.close,
}));


const xAxis = (context, x, height) => {
  const tickCount = 10;
  const tickSize = 6;
  const ticks = x.ticks(tickCount);
  const tickFormat = x.tickFormat();

  context.beginPath();
  ticks.forEach(d =>  {
    context.moveTo(x(d), height);
    context.lineTo(x(d), height + tickSize);
  });
  context.strokeStyle = "black";
  context.stroke();

  context.textAlign = "center";
  context.textBaseline = "top";
  ticks.forEach(d => context.fillText(tickFormat(d), x(d), height + tickSize));
};

const yAxis = (context, y, height) => {
  const tickCount = 10;
  const tickSize = 6;
  const tickPadding = 3;
  const ticks = y.ticks(tickCount);
  const tickFormat = y.tickFormat(tickCount);

  context.beginPath();
  ticks.forEach(d => {
    context.moveTo(0, y(d));
    context.lineTo(-6, y(d));
  });
  context.strokeStyle = "black";
  context.stroke();

  context.beginPath();
  context.moveTo(-tickSize, 0);
  context.lineTo(0.5, 0);
  context.lineTo(0.5, height);
  context.lineTo(-tickSize, height);
  context.strokeStyle = "black";
  context.stroke();

  context.textAlign = "right";
  context.textBaseline = "middle";
  ticks.forEach(d => context.fillText(tickFormat(d), -tickSize - tickPadding, y(d)));

  context.save();
  context.rotate(-Math.PI / 2);
  context.textAlign = "right";
  context.textBaseline = "top";
  context.font = "bold 10px sans-serif";
  context.fillText("Price (US$)", -10, 10);
  context.restore();
};



app.get('/canvas', (req, res) => {
  const canvas = new Canvas(800, 800);
  const context = canvas.getContext('2d');

  const margin = { top: 20, right: 20, bottom: 30, left: 50 };
  const width = canvas.width - margin.left - margin.right;
  const height = canvas.height - margin.top - margin.bottom;

  const x = d3.scaleTime()
      .range([0, width]);

  const y = d3.scaleLinear()
      .range([height, 0]);

  const line = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.close))
      .curve(d3.curveStep)
      .context(context);

  context.translate(margin.left, margin.top);

  x.domain(d3.extent(data, d => d.date));
  y.domain(d3.extent(data, d => d.close));

  xAxis(context, x, height);
  yAxis(context, y, height);

  context.beginPath();
  line(data);
  context.lineWidth = 1.5;
  context.strokeStyle = "steelblue";
  context.stroke();

  // res.send('<img src="' + canvas.toDataURL() + '" />');
  res.set({ 'Content-Type': 'image/png' });
  canvas.pngStream().pipe(res);
});



app.get('/svg', (req, res) => {
  const document = jsdom.jsdom('<svg xmlns="http://www.w3.org/2000/svg" id="svg" width="800" height="800"></svg>');

  const svg = d3.select(document.getElementById('svg'));
  const margin = {top: 20, right: 20, bottom: 30, left: 50};
  const width = svg.attr("width") - margin.left - margin.right;
  const height = svg.attr("height") - margin.top - margin.bottom;
  const g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  const x = d3.scaleTime()
      .rangeRound([0, width]);

  const y = d3.scaleLinear()
      .rangeRound([height, 0]);

  const line = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.close))
      .curve(d3.curveStep);

  x.domain(d3.extent(data, d => d.date));
  y.domain(d3.extent(data, d => d.close));

  g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x));

  g.append("g")
      .attr("class", "axis axis--y")
      .call(d3.axisLeft(y))
    .append("text")
      .attr("fill", "#000")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", "0.71em")
      .style("text-anchor", "end")
      .text("Price ($)");

  g.append("path")
      .datum(data)
      .attr("class", "line")
      .attr("style", "fill: none; stroke: steelblue; stroke-width: 1.5px;")
      .attr("d", line);

  res.set({ 'Content-Type': 'image/svg+xml' });
  res.send(document.getElementById('svg').outerHTML);
});





app.get('/cavas-direct', (req, res) => {
  const canvas = new Canvas(400, 400);
  const context = canvas.getContext('2d');

  context.font = '30px Impact';
  context.rotate(.1);
  context.fillText("Awesome!", 50, 100);

  const text = context.measureText('Awesome!');
  context.strokeStyle = 'rgba(0,0,0,0.5)';
  context.beginPath();
  context.lineTo(50, 102);
  context.lineTo(50 + text.width, 102);
  context.stroke();

  // res.send('<img src="' + canvas.toDataURL() + '" />');
  res.set({ 'Content-Type': 'image/png' });
  canvas.pngStream().pipe(res);
});



app.get('/', (req, res) => res.send('Up and running'));

app.listen(3000, () => console.log("App listening on port 3000"));
