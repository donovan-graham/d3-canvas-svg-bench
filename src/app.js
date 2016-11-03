const express = require('express');
const fs = require('fs');
const d3 = require('d3');
require('d3-selection-multi');

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

  context.stroke();

  // res.send('<img src="' + canvas.toDataURL() + '" />');
  res.set({ 'Content-Type': 'image/png' });
  canvas.pngStream().pipe(res);
});



app.get('/svg', (req, res) => {

  const width = 800;
  const height = 800;
  const margin = { top: 20, right: 20, bottom: 30, left: 50 };
  const graphWidth = width - margin.left - margin.right;
  const graphHeight = height - margin.top - margin.bottom;

  const tmpl = `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="svg" width="${width}" height="${height}">
      <g transform="translate(${margin.left},${margin.top})">
          <g class="axis axis--x"></g>
          <g class="axis axis--y"></g>
          <path class="line line--area"></path>
      </g>
      <defs>
        <pattern id="stripes" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45 0 0)">
          <line stroke="red" strokeWidth="1px" y2="3"/>
        </pattern>
      </defs>
    </svg>`;

  const document = jsdom.jsdom(tmpl);

  const svg = d3.select(document.getElementById('svg'));
  const g = svg.select('g');

  const x = d3.scaleTime()
      .rangeRound([0, graphWidth]);

  const y = d3.scaleLinear()
      .rangeRound([graphHeight, 0]);

  // const line = d3.line()
  //     .x(d => x(d.date))
  //     .y(d => y(d.close))
  //     .curve(d3.curveStep);

  var area = d3.area()
      .curve(d3.curveStep)
      .x(d => x(d.date))
      .y0(graphHeight)
      .y1(d => y(d.close));

  x.domain(d3.extent(data, d => d.date));
  y.domain(d3.extent(data, d => d.close));

  g.select('g.axis--x')
    .attrs({
      transform: `translate(0,${graphHeight})`,
    })
    .call(d3.axisBottom(x));

  g.select('g.axis--y')
      .call(d3.axisLeft(y))
    .append("text")
      .attrs({
        fill: "#000",
        transform: "rotate(-90)",
        y: 6,
        dy: "0.71em",
        style: "text-anchor:end",
      })
      .text("Price ($)");

  g.select('path.line--area')
    .datum(data)
    .attrs({
      fill: 'url(#stripes)',
    })
    .attr("d", area);
    // .attr("style", "fill: lightblue; stroke: steelblue; stroke-width: 0.5px;stroke-left:none;")
    // .attr("d", line);

  res.set({ 'Content-Type': 'image/svg+xml' });
  res.send(document.getElementById('svg').outerHTML);
});





app.get('/chart', (req, res) => {

  // const parseTime = d3.timeParse("%d-%b-%y");
  const parseTime = d3.timeParse("%Y-%m-%d");

  const chartData = JSON.parse(fs.readFileSync('./debugData.json', 'utf8')).map(d => ({
    date: parseTime(d.date),
    savings: d.savings,
    regularNominal: d.regularNominal,
    regularReal: d.regularReal,
    additionalNominal: d.additionalNominal,
    additionalReal: d.additionalReal,
  }));

  // const maxY = d3.max([
  //   d3.max(_chartData, d => d.savings),
  //   d3.max(_chartData, d => d.regularNominal),
  //   d3.max(_chartData, d => d.additionalNominal),
  //   shortfallAmountAbsolute,
  // ]);

  //
  // const zeroedData = area(Array(chartData.length).fill(0));

  const width = 800;
  const height = 800;
  const margin = { top: 20, right: 20, bottom: 30, left: 50 };
  const graphWidth = width - margin.left - margin.right;
  const graphHeight = height - margin.top - margin.bottom;

  const tmpl = `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="svg" width="${width}" height="${height}">
      <style>
        .grid .tick {
          stroke-opacity: 0.1;
          shape-rendering: crispEdges;
        }
      </style>
      <g transform="translate(${margin.left},${margin.top})">
          <g class="axis axis--x"></g>
          <g class="axis axis--y"></g>
          <g class="grid grid--x"></g>
          <g class="grid grid--y"></g>
          <path class="line line--area"></path>
      </g>
      <defs>
        <pattern id="stripes" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45 0 0)">
          <line stroke="red" strokeWidth="1px" y2="3"/>
        </pattern>
      </defs>
    </svg>`;

  const document = jsdom.jsdom(tmpl);

  const svg = d3.select(document.getElementById('svg'));
  const g = svg.select('g');

  var x = d3.scaleTime()
      // .domain([new Date(2016, 08, 1), new Date(2083, 08, 2)])
      .domain(d3.extent(chartData, d => d.date))
      .range([0, graphWidth]);

  // const x = d3.scaleTime()
  //     .ticks(d3.time.years, 1)
  //     // .domain([new Date(2000, 0, 1), new Date(2000, 0, 2)])
  //     .rangeRound([0, graphWidth]);
  //

  const y = d3.scaleLinear()
      .rangeRound([graphHeight, 0]);

  // const line = d3.line()
  //     .x(d => x(d.date))
  //     .y(d => y(d.close))
  //     .curve(d3.curveStep);


  // x.domain(d3.extent(chartData, d => d.date));
  y.domain(d3.extent(chartData, d => d.regularNominal));


  const xTicks = d3.timeYear.every(10);
  const xAxis = d3.axisBottom(x)
    .ticks(xTicks)

  const xGrid = d3.axisBottom(x)
    .ticks(xTicks)
    .tickSize(-graphHeight)
    .tickFormat("");

  g.select('g.axis--x')
    .attrs({ transform: `translate(0,${graphHeight})` })
    .call(xAxis);

  g.select('g.grid--x')
    .attrs({ transform: `translate(0,${graphHeight})` })
    .call(xGrid)

  const yTicks = 5;
  const yAxis = d3.axisLeft(y)
    .ticks(yTicks);

  const yGrid = d3.axisLeft(y)
    .ticks(yTicks)
    .tickSize(-graphWidth)
    .tickFormat("");

  g.select('g.axis--y')
    .call(yAxis)
    .append("text")
      .attrs({
        fill: "#000",
        transform: "rotate(-90)",
        y: 10,
        x: -10,
        dy: "0.71em",
        style: "text-anchor:end",
      })
      .text("Price ($)");


  g.select('g.grid--y')
    .attrs({ transform: `translate(0,0)` })
    .call(yGrid)



  const area = d3.area()
      .curve(d3.curveStep)
      .x(d => x(d.date))
      .y0(graphHeight)
      .y1(d => y(d.regularNominal));


  // const line = d3.line()
  //     .x(d => x(d.date))
  //     .y(d => y(d.regularNominal))
  //     .curve(d3.curveStep);


  g.select('path.line--area')
    .datum(chartData)
    .attrs({
      fill: 'url(#stripes)',
    })
    .attr("d", area);
    //
    // .attr("style", "fill: lightblue; stroke: steelblue; stroke-width: 0.5px;stroke-left:none;")
    // .attr("d", line);

  // const savingsData = chartData.map(x => x.savings);
  // const regularData = chartData.map(x => x.regularNominal);
  // const additionalData = chartData.map(x => x.additionalNominal);



  // res.set({ 'Content-Type': 'image/svg+xml' });
  // res.send(document.getElementById('svg').outerHTML);
  res.send(document.documentElement.outerHTML);
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
