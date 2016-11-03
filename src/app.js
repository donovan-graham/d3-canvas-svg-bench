const cluster = require('cluster');
const os = require('os')
const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');

const d3 = require('d3');
require('d3-selection-multi');

const jsdom = require("jsdom");
const Canvas = require('canvas');

const app = express();
app.use(bodyParser.json({ limit: '1mb' }));
// app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded


app.get('/canvas', (req, res) => {
  const parseTime = d3.timeParse("%d-%b-%y");
  const data = JSON.parse(fs.readFileSync('./data.json', 'utf8')).map(d => ({
    date: parseTime(d.date),
    close: d.close,
  }));

  const canvas = new Canvas(800, 800);
  const context = canvas.getContext('2d');

  const margin = { top: 20, right: 20, bottom: 30, left: 50 };
  const width = canvas.width - margin.left - margin.right;
  const height = canvas.height - margin.top - margin.bottom;


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
  const parseTime = d3.timeParse("%d-%b-%y");
  const data = JSON.parse(fs.readFileSync('./data.json', 'utf8')).map(d => ({
    date: parseTime(d.date),
    close: d.close,
  }));

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


  res.set({ 'Content-Type': 'image/svg+xml' });
  res.send(document.getElementById('svg').outerHTML);
});


app.post('/test', (req, res) => {
  console.log(req.body[0]);
  res.send('OK');
});


app.post('/chart', (req, res) => {
  const parseTime = d3.timeParse("%Y-%m-%d");

  // const chartData = JSON.parse(fs.readFileSync('./debugData.json', 'utf8')).map(d => ({
  const chartData = req.body.map(d => ({
    date: parseTime(d.date),
    saving: d.savings,
    regular: d.regularNominal,
    additional: d.additionalNominal,
  }));

  const maxY = d3.max([
    d3.max(chartData, d => d.saving),
    d3.max(chartData, d => d.regular),
    d3.max(chartData, d => d.additional),
  ]);

  const width = 800;
  const height = 800;
  const margin = { top: 20, right: 20, bottom: 30, left: 50 };
  const graphWidth = width - margin.left - margin.right;
  const graphHeight = height - margin.top - margin.bottom;

  const tmpl = `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="svg" width="${width}" height="${height}">
      <style>
        .tick {
          stroke-opacity: 0.1;
          shape-rendering: crispEdges;
        }
      </style>
      <g transform="translate(${margin.left},${margin.top})">
          <g class="axis axis__x"></g>
          <g class="axis axis__y"></g>
          <path class="line area__savings"></path>
          <path class="line area__regular"></path>
          <path class="line area__additional"></path>
      </g>
      <defs>
        <pattern id="stripe__red" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45 0 0)">
          <line stroke="red" strokeWidth="1px" y2="3"/>
        </pattern>
        <pattern id="stripe__green" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45 0 0)">
          <line stroke="green" strokeWidth="1px" y2="3"/>
        </pattern>
        <pattern id="stripe__blue" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45 0 0)">
          <line stroke="blue" strokeWidth="1px" y2="3"/>
        </pattern>
      </defs>
    </svg>`;

  const document = jsdom.jsdom(tmpl);

  const svg = d3.select(document.getElementById('svg'));
  const g = svg.select('g');

  const x = d3.scaleTime()
      .domain(d3.extent(chartData, d => d.date))
      .range([0, graphWidth]);

  const y = d3.scaleLinear()
      .rangeRound([graphHeight, 0])
      .domain([0, maxY])
      .nice();

  const xAxis = d3.axisBottom(x)
    .ticks(d3.timeYear.every(10))
    .tickSize(-graphHeight)
    .tickPadding(10);

  g.select('g.axis__x')
    .attrs({ transform: `translate(0,${graphHeight})` })
    .call(xAxis);

  const yAxis = d3.axisLeft(y)
    .ticks(5)
    .tickSize(-graphWidth)
    .tickPadding(10);

  g.select('g.axis__y')
    .call(yAxis);

  const savingsArea = d3.area()
      .curve(d3.curveStep)
      .x(d => x(d.date))
      .y0(graphHeight)
      .y1(d => y(d.saving));

  const regularArea = d3.area()
      .curve(d3.curveStep)
      .x(d => x(d.date))
      .y0(graphHeight)
      .y1(d => y(d.regular));

  const additionalArea = d3.area()
      .curve(d3.curveStep)
      .x(d => x(d.date))
      .y0(graphHeight)
      .y1(d => y(d.additional));


  g.select('path.area__savings')
    .datum(chartData)
    .attr('fill', 'url(#stripe__red)')
    .attr("d", savingsArea);

  g.select('path.area__regular')
    .datum(chartData)
    .attr('fill', 'url(#stripe__green)')
    .attr("d", regularArea);

  g.select('path.area__additional')
    .datum(chartData)
    .attr('fill', 'url(#stripe__blue)')
    .attr("d", additionalArea);

  res.set({ 'Content-Type': 'image/svg+xml' });
  res.send(document.getElementById('svg').outerHTML);
  // res.send(document.documentElement.outerHTML);
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


if (process.env.NODE_ENV === 'production' && cluster.isMaster) {
  const numCPUs = os.cpus().length;
  let i = 0;
  for (i; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker) =>
    console.log(`worker ${worker.process.pid} died`));
} else {
  app.listen(3000, () => console.log('App listening on port 3000'));
}
