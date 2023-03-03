import {
  createOnce,
  endTracking,
  hide,
  TransitionsManager,
} from "../helperFunctions.js";

let svg, viewBox, paddedViewBox, dataset, xScale, yScale;

// setup to use library
const numberOfSteps = 5;
const manager = new TransitionsManager(numberOfSteps);
const drawFunctions = [drawStep0, drawStep1, drawStep2, drawStep3, drawStep4];

setUpvariables();
setUpNavigation();
manager.drawStepWithAutoReverse(false, drawFunctions[0]);

function setUpNavigation() {
  document.getElementById("step").textContent = "View: 0";

  d3.selectAll(".nav-button").on("click", function () {
    const id = d3.select(this).attr("id");

    if (manager.getNumberOfActiveTransitions() === 0) {
      if (id === "next" && manager.getStep() < numberOfSteps - 1) {
        manager.incrementStep();
        manager.drawStepWithAutoReverse(
          false,
          drawFunctions[manager.getStep()]
        );
      } else if (id === "prev" && manager.getStep() > 0) {
        manager.decrementStep();
        manager.drawStepWithAutoReverse(true, drawFunctions[manager.getStep()]);
      }

      document.getElementById("step").textContent =
        "View: " + manager.getStep();
    }
  });
}

function setUpvariables() {
  // determine viewBox measurements
  viewBox = {
    width: 1000,
    height: 500,
    paddingTop: 150,
    paddingBottom: 40,
    paddingLeft: 140,
    paddingRight: 160,
  };

  paddedViewBox = {
    width: viewBox.width - viewBox.paddingLeft - viewBox.paddingRight,
    height: viewBox.height - viewBox.paddingTop - viewBox.paddingBottom,
  };

  // create viewBox
  svg = d3
    .select("#visualization")
    .append("svg")
    .attr("viewBox", "0 0 " + viewBox.width + " " + viewBox.height);

  // create data
  dataset = [];
  for (var i = 0; i < 15; i++) {
    dataset.push(Math.floor(Math.random() * 30) + 3);
  }

  // create scales
  xScale = d3
    .scaleBand()
    .domain(dataset.map((d, i) => i))
    .range([viewBox.paddingLeft, viewBox.width - viewBox.paddingRight])
    .round(true)
    .paddingInner(0.1);

  yScale = d3
    .scaleLinear()
    .domain([0, d3.max(dataset)])
    .range([paddedViewBox.height + viewBox.paddingTop, viewBox.paddingTop]);
}

function drawStep0() {
  //create x-axis
  const xAxisGenerator = d3.axisBottom().scale(xScale);
  const xAxis = svg
    .append("g")
    .attr("id", "x-axis")
    .attr("opacity", 1)
    .attr(
      "transform",
      "translate(0," + (paddedViewBox.height + viewBox.paddingTop) + ")"
    )
    .call(xAxisGenerator);
  xAxis.selectAll(".tick text").attr("font-size", "20").attr("y", 15);


  // create bars
  const bars = svg
    .append("g")
    .attr("id", "bars")
    .selectAll("rect")
    .data(dataset)
    .enter()
    .append("rect")
    .attr("id", (d, i) => "bar-" + i)
    .attr("fill", "#4242eb")
    .attr("width", xScale.bandwidth())
    .attr("x", (d, i) => xScale(i))
    .attr("height", 0)
    .attr("y", viewBox.paddingTop + paddedViewBox.height)
    .saveState(manager);

  // transition bars
  bars
    .trackedTransition(manager)
    .delay((d, i) => i * 50)
    .on("end", function () {
      endTracking(manager, this);
    })
    .attr("y", (d) => yScale(d))
    .attr("height", (d) => yScale(0) - yScale(d));
}
function drawStep1() {
  // create y-axis
  const yAxisGenerator = d3.axisLeft().scale(yScale);
  createOnce("y-axis", () =>
    svg
      .append("g")
      .attr("id", "y-axis")
      .attr("opacity", 0)
      .attr("transform", "translate(-10,0)")
      .saveState(manager)
      .call(yAxisGenerator)
      .selectAll(".tick text")
      .attr("font-size", "20")
      .attr("x", -15)
  );

  svg
    .select("#y-axis")
    .trackedTransition(manager)
    .on("end", function () {
      endTracking(manager, this);
    })
    .attr("transform", "translate(" + viewBox.paddingLeft + ",0)")
    .attr("opacity", 1);
}
function drawStep2() {
  // create mean line
  createOnce("mean-vis", () => {
    const meanVis = svg
      .append("g")
      .attr("id", "mean-vis")
      .attr("opacity", 0)
      .attr("transform", "translate(0,0)") // needs to be set!
      .saveState(manager);

    meanVis
      .append("rect")
      .attr("width", paddedViewBox.width + 20)
      .attr("x", viewBox.paddingLeft)
      .attr("height", 2);

    meanVis
      .append("text")
      .text("mean")
      .attr("font-size", "20")
      .attr("font-family", "sans-serif")
      .attr("text-anchor", "center")
      .attr("dominant-baseline", "central")
      .attr("x", viewBox.paddingLeft + paddedViewBox.width + 30);
  });

  // transition mean line
  d3.select("#mean-vis")
    .trackedTransition(manager)
    .on("end", function () {
      endTracking(manager, this);
    })
    .attr("transform", "translate(0," + yScale(d3.mean(dataset)) + ")")
    .attr("opacity", 1);
}
function drawStep3() {
  // transiton all bars that are smaller than the mean
  const bars = svg.selectAll("#bars rect").data(dataset);
  bars
    .filter((d) => d < d3.mean(dataset))
    .trackedTransition(manager)
    .on("end", function () {
      endTracking(manager, this);
    })
    .attr("fill", "#699dff");
}
function drawStep4() {
  const topThreeValues = [...dataset]
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    .slice(0, 3);

  // remove mean line
  svg
    .select("#mean-vis")
    .trackedTransition(manager)
    .on("end", function () {
      endTracking(manager, this);
      hide(this);
    })
    .attr("transform", "translate(0,0)")
    .attr("opacity", 0);

  // create text "top values"
  createOnce("top-values-text", () =>
    svg
      .append("text")
      .attr("id", "top-values-text")
      .attr("opacity", 0)
      .text("top values")
      .attr("font-size", 20)
      .attr("text-anchor", "middle")
      .attr("fill", "#ff0000")
      .attr("font-family", "sans-serif")
      .attr("y", 0)
      .attr("x", viewBox.paddingLeft + 0.5 * paddedViewBox.width)
      .saveState(manager)
  );

  // transition text
  d3.select("#top-values-text")
    .trackedTransition(manager)
    .on("end", function () {
      endTracking(manager, this);
    })
    .attr("y", yScale(d3.max(dataset)) - 40)
    .attr("opacity", 1);

  //transition bars with high values
  const bars = d3.selectAll("#bars rect").data(dataset);
  bars
    .trackedTransition(manager)
    .attr("fill", (d) => (topThreeValues.includes(d) ? "#ff0000" : "#4242eb"))
    .on("end", function () {
      endTracking(manager, this);
    });
}
