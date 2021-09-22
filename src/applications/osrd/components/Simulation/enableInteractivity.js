import * as d3 from 'd3';
import { store } from 'Store';
import drawGuideLines from 'applications/osrd/components/Simulation/drawGuideLines';
import { gridX, gridY, interpolateOnPosition } from 'applications/osrd/components/Helpers/ChartHelpers';
import {
  updateMustRedraw, updateTimePosition,
} from 'reducers/osrdsimulation';

export const displayGuide = (chart, opacity) => {
  chart.svg.selectAll('#vertical-line').style('opacity', opacity);
  chart.svg.selectAll('#horizontal-line').style('opacity', opacity);
  chart.svg.selectAll('.pointer').style('opacity', opacity);
};

export const updatePointers = (
  chart, keyValues, listValues, positionValues, rotate,
) => {
  listValues.forEach((name) => {
    if (positionValues[name]) {
      chart.svg.selectAll(`#pointer-${name}`)
        .attr('cx', (rotate
          ? chart.x(positionValues[name][keyValues[1]])
          : chart.x(positionValues[name][keyValues[0]])))
        .attr('cy', (rotate
          ? chart.y(positionValues[name][keyValues[0]])
          : chart.y(positionValues[name][keyValues[1]])));
    }
  });
};

const updateChart = (chart, keyValues, rotate) => {
  // recover the new scale
  const newX = d3.event.sourceEvent.shiftKey && rotate
    ? chart.x : d3.event.transform.rescaleX(chart.x);
  const newY = d3.event.sourceEvent.shiftKey && !rotate
    ? chart.y : d3.event.transform.rescaleY(chart.y);

  // update axes with these new boundaries
  const axisBottomX = !rotate && keyValues[0] === 'time'
    ? d3.axisBottom(newX).tickFormat(d3.timeFormat('%H:%M:%S')) : d3.axisBottom(newX);
  const axisLeftY = rotate && keyValues[0] === 'time'
    ? d3.axisLeft(newY).tickFormat(d3.timeFormat('%H:%M:%S')) : d3.axisLeft(newY);
  chart.xAxis.call(axisBottomX);
  chart.yAxis.call(axisLeftY);

  chart.xAxisGrid.call(gridX(newX, chart.height));
  chart.yAxisGrid.call(gridY(newY, chart.width));

  // update lines & areas
  chart.drawZone
    .selectAll('.line')
    .attr('d', d3.line()
      .x((d) => newX((rotate ? d[keyValues[1]] : d[keyValues[0]])))
      .y((d) => newY((rotate ? d[keyValues[0]] : d[keyValues[1]]))));

  chart.drawZone
    .selectAll('.area')
    .attr('d', (rotate
      ? d3.area()
        .y((d) => newY(d[keyValues[0]]))
        .x0((d) => newX(d.value0))
        .x1((d) => newX(d.value1))
      : d3.area()
        .x((d) => newX(d[keyValues[0]]))
        .y0((d) => newY(d.value0))
        .y1((d) => newY(d.value1))));

  chart.drawZone
    .selectAll('.curve-label')
    .attr('transform', d3.event.transform);

  chart.drawZone
    .selectAll('.conflictsPoints')
    .attr('cx', (d) => newX((rotate ? d[keyValues[1]] : d[keyValues[0]])))
    .attr('cy', (d) => newY((rotate ? d[keyValues[0]] : d[keyValues[1]])));
  return { newX, newY };
};

export const traceVerticalLine = (
  chart, dataSimulation, keyValues, listValues,
  positionValues, refValueName, rotate, timePosition,
) => {
  if (chart !== undefined
    && d3.event === null) {
    displayGuide(chart, 1);
    if (rotate) {
      // chart.svg.selectAll('#vertical-line').style('opacity', 0);
      chart.svg.selectAll('#horizontal-line')
        .attr('y1', chart.y(keyValues[0] !== 'time' && positionValues.speed ? positionValues.speed.position : timePosition))
        .attr('y2', chart.y(keyValues[0] !== 'time' && positionValues.speed ? positionValues.speed.position : timePosition));
    } else {
      // chart.svg.selectAll('#horizontal-line').style('opacity', 0);
      chart.svg.selectAll('#vertical-line')
        .attr('x1', chart.x(keyValues[0] !== 'time' && positionValues.speed ? positionValues.speed.position : timePosition))
        .attr('x2', chart.x(keyValues[0] !== 'time' && positionValues.speed ? positionValues.speed.position : timePosition));
    }
    updatePointers(
      chart, keyValues,
      listValues, positionValues, rotate,
    );
  }
};

const enableInteractivity = (
  chart, dataSimulation, dispatch, keyValues,
  listValues, positionValues, rotate,
  setChart, setYPosition, setZoomLevel, yPosition, zoomLevel,
) => {
  let newHoverPosition;

  const zoom = d3.zoom(newHoverPosition)
    .scaleExtent([0.5, 20]) // This control how much you can unzoom (x0.5) and zoom (x20)
    .extent([[0, 0], [chart.width, chart.height]])
    .on('zoom', () => {
      // Permit zoom if shift pressed, if only move or if factor > .5
      if ((d3.event.sourceEvent.shiftKey
        || d3.event.transform.k >= 1
        || zoomLevel >= 0.5)
        && (chart.y.domain()[0] >= 0 || d3.event.transform.y >= 0 || d3.event.transform.k !== 1)) {
        setZoomLevel(zoomLevel * d3.event.transform.k);
        setYPosition(yPosition + d3.event.transform.y);
        const zoomFunctions = updateChart(chart, keyValues, rotate);
        const newChart = { ...chart, x: zoomFunctions.newX, y: zoomFunctions.newY };
        setChart(newChart);
      }
    })
    .filter(() => d3.event.button === 0 || d3.event.button === 1)
    .on('end', () => dispatch(updateMustRedraw(true)));

  const mousemove = () => {
    // If GET && not playing
    const { osrdsimulation } = store.getState();
    if (!osrdsimulation.isPlaying) {
      if (keyValues[0] === 'time') {
        // recover coordinate we need
        const timePositionLocal = rotate
          ? chart.y.invert(d3.mouse(d3.event.currentTarget)[1])
          : chart.x.invert(d3.mouse(d3.event.currentTarget)[0]);
        dispatch(updateTimePosition(timePositionLocal));
      } else {
        // If GEV
        const positionLocal = rotate
          ? chart.y.invert(d3.mouse(d3.event.currentTarget)[1])
          : chart.x.invert(d3.mouse(d3.event.currentTarget)[0]);
        const timePositionLocal = interpolateOnPosition(dataSimulation, keyValues, positionLocal);
        if (timePositionLocal) {
          dispatch(updateTimePosition(timePositionLocal));
        }
      }

      // Update guideLines
      chart.svg.selectAll('#vertical-line')
        .attr('x1', d3.mouse(d3.event.currentTarget)[0])
        .attr('x2', d3.mouse(d3.event.currentTarget)[0]);
      chart.svg.selectAll('#horizontal-line')
        .attr('y1', d3.mouse(d3.event.currentTarget)[1])
        .attr('y2', d3.mouse(d3.event.currentTarget)[1]);
    }
  };

  chart.svg // .selectAll('.zoomable')
    .on('mouseover', () => displayGuide(chart, 1))
    .on('mousemove', () => mousemove())
    .call(zoom);
  drawGuideLines(chart);
};

export default enableInteractivity;
