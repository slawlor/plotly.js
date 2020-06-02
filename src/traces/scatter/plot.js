/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/


'use strict';

var d3 = require('d3');

var Lib = require('../../lib');
var Drawing = require('../../components/drawing');
var ErrorBars = require('../../components/errorbars');

var subTypes = require('./subtypes');
var arraysToCalcdata = require('./arrays_to_calcdata');
var linePoints = require('./line_points');


module.exports = function plot(gd, plotinfo, cdscatter) {
    selectMarkers(gd, plotinfo, cdscatter);

    var xa = plotinfo.x(),
        ya = plotinfo.y();

    // make the container for scatter plots
    // (so error bars can find them along with bars)
    var scattertraces = plotinfo.plot.select('.scatterlayer')
        .selectAll('g.trace.scatter')
        .data(cdscatter);

    scattertraces.enter().append('g')
        .attr('class', 'trace scatter')
        .style('stroke-miterlimit', 2);

    // error bars are at the bottom
    scattertraces.call(ErrorBars.plot, plotinfo);

    // BUILD LINES AND FILLS
    var prevpath = '',
        tozero, tonext, nexttonext;

    scattertraces.each(function(d) {
        var trace = d[0].trace,
            line = trace.line,
            tr = d3.select(this);
        if(trace.visible !== true) return;

        d[0].node3 = tr; // store node for tweaking by selectPoints

        arraysToCalcdata(d);

        if(!subTypes.hasLines(trace) && trace.fill === 'none') return;

        var thispath,
            // fullpath is all paths for this curve, joined together straight
            // across gaps, for filling
            fullpath = '',
            // revpath is fullpath reversed, for fill-to-next
            revpath = '',
            // functions for converting a point array to a path
            pathfn, revpathbase, revpathfn;

        // make the fill-to-zero path now, so it shows behind the line
        // fill to next puts the fill associated with one trace
        // grouped with the previous
        if(trace.fill.substr(0, 6) === 'tozero' ||
                (trace.fill.substr(0, 2) === 'to' && !prevpath)) {
            tozero = tr.append('path')
                .classed('js-fill', true);
        }
        else tozero = null;

        // make the fill-to-next path now for the NEXT trace, so it shows
        // behind both lines.
        // nexttonext was created last time, but give it
        // this curve's data for fill color
        if(nexttonext) tonext = nexttonext.datum(d);

        // now make a new nexttonext for next time
        nexttonext = tr.append('path').classed('js-fill', true);

        if(['hv', 'vh', 'hvh', 'vhv'].indexOf(line.shape) !== -1) {
            pathfn = Drawing.steps(line.shape);
            revpathbase = Drawing.steps(
                line.shape.split('').reverse().join('')
            );
        }
        else if(line.shape === 'spline') {
            pathfn = revpathbase = function(pts) {
                return Drawing.smoothopen(pts, line.smoothing);
            };
        }
        else {
            pathfn = revpathbase = function(pts) {
                return 'M' + pts.join('L');
            };
        }

        revpathfn = function(pts) {
            // note: this is destructive (reverses pts in place) so can't use pts after this
            return 'L' + revpathbase(pts.reverse()).substr(1);
        };

        var segments = linePoints(d, {
            xaxis: xa,
            yaxis: ya,
            connectGaps: trace.connectgaps,
            baseTolerance: Math.max(line.width || 1, 3) / 4,
            linear: line.shape === 'linear'
        });

        if(segments.length) {
            var pt0 = segments[0][0],
                lastSegment = segments[segments.length - 1],
                pt1 = lastSegment[lastSegment.length - 1];

            for(var i = 0; i < segments.length; i++) {
                var pts = segments[i];
                thispath = pathfn(pts);
                fullpath += fullpath ? ('L' + thispath.substr(1)) : thispath;
                revpath = revpathfn(pts) + revpath;
                if(subTypes.hasLines(trace) && pts.length > 1) {
                    tr.append('path').classed('js-line', true).attr('d', thispath);
                }
            }
            if(tozero) {
                if(pt0 && pt1) {
                    if(trace.fill.charAt(trace.fill.length - 1) === 'y') {
                        pt0[1] = pt1[1] = ya.c2p(0, true);
                    }
                    else pt0[0] = pt1[0] = xa.c2p(0, true);

                    // fill to zero: full trace path, plus extension of
                    // the endpoints to the appropriate axis
                    tozero.attr('d', fullpath + 'L' + pt1 + 'L' + pt0 + 'Z');
                }
            }
            else if(trace.fill.substr(0, 6) === 'tonext' && fullpath && prevpath) {
                // fill to next: full trace path, plus the previous path reversed
                tonext.attr('d', fullpath + prevpath + 'Z');
            }
            prevpath = revpath;
        }
    });

    // remove paths that didn't get used
    scattertraces.selectAll('path:not([d])').remove();

    function visFilter(d) {
        return d.filter(function(v) { return v.vis; });
    }

<<<<<<< HEAD
    scattertraces.append('g')
        .attr('class', 'points')
        .each(function(d) {
            var trace = d[0].trace,
                s = d3.select(this),
                showMarkers = subTypes.hasMarkers(trace),
                showText = subTypes.hasText(trace);

            if((!showMarkers && !showText) || trace.visible !== true) s.remove();
            else {
                if(showMarkers) {
                    s.selectAll('path.point')
                        .data(trace.marker.maxdisplayed ? visFilter : Lib.identity)
                        .enter().append('path')
                            .classed('point', true)
                            .call(Drawing.translatePoints, xa, ya);
=======
    function gapFilter(d) {
        return d.filter(function(v) { return !v.gap; });
    }

    function keyFunc(d) {
        return d.id;
    }

    // Returns a function if the trace is keyed, otherwise returns undefined
    function getKeyFunc(trace) {
        if(trace.ids) {
            return keyFunc;
        }
    }

    function hideFilter() {
        return false;
    }

    function makePoints(points, text, cdscatter) {
        var join, selection, hasNode;

        var trace = cdscatter[0].trace;
        var showMarkers = subTypes.hasMarkers(trace);
        var showText = subTypes.hasText(trace);

        var keyFunc = getKeyFunc(trace);
        var markerFilter = hideFilter;
        var textFilter = hideFilter;

        if(showMarkers || showText) {
            var showFilter = identity;
            // if we're stacking, "infer zero" gap mode gets markers in the
            // gap points - because we've inferred a zero there - but other
            // modes (currently "interpolate", later "interrupt" hopefully)
            // we don't draw generated markers
            var stackGroup = trace.stackgroup;
            var isInferZero = stackGroup && (
                gd._fullLayout._scatterStackOpts[xa._id + ya._id][stackGroup].stackgaps === 'infer zero');
            if(trace.marker.maxdisplayed || trace._needsCull) {
                showFilter = isInferZero ? visFilterWithGaps : visFilter;
            } else if(stackGroup && !isInferZero) {
                showFilter = gapFilter;
            }

            if(showMarkers) markerFilter = showFilter;
            if(showText) textFilter = showFilter;
        }

        // marker points

        selection = points.selectAll('path.point');

        join = selection.data(markerFilter, keyFunc);

        var enter = join.enter().append('path')
            .classed('point', true);

        if(hasTransition) {
            enter
                .call(Drawing.pointStyle, trace, gd)
                .call(Drawing.translatePoints, xa, ya, gd)
                .style('opacity', 0)
                .transition()
                .style('opacity', 1);
        }

        join.order();

        var styleFns;
        if(showMarkers) {
            styleFns = Drawing.makePointStyleFns(trace);
        }

        join.each(function(d) {
            var el = d3.select(this);
            var sel = transition(el);
            hasNode = Drawing.translatePoint(d, sel, xa, ya, gd);

            if(hasNode) {
                Drawing.singlePointStyle(d, sel, trace, styleFns, gd);

                if(plotinfo.layerClipId) {
                    Drawing.hideOutsideRangePoint(d, sel, xa, ya, trace.xcalendar, trace.ycalendar);
>>>>>>> 121637d76... Merging initial.diff from WLChung
                }
                if(showText) {
                    s.selectAll('g')
                        .data(trace.marker.maxdisplayed ? visFilter : Lib.identity)
                        // each text needs to go in its own 'g' in case
                        // it gets converted to mathjax
                        .enter().append('g')
                            .append('text')
                            .call(Drawing.translatePoints, xa, ya);
                }
            }
        });
};

<<<<<<< HEAD
function selectMarkers(gd, plotinfo, cdscatter) {
    var xa = plotinfo.x(),
        ya = plotinfo.y(),
        xr = d3.extent(xa.range.map(xa.l2c)),
        yr = d3.extent(ya.range.map(ya.l2c));
=======
        if(hasTransition) {
            join.exit().transition()
                .style('opacity', 0)
                .remove();
        } else {
            join.exit().remove();
        }

        // text points
        selection = text.selectAll('g');
        join = selection.data(textFilter, keyFunc);

        // each text needs to go in its own 'g' in case
        // it gets converted to mathjax
        join.enter().append('g').classed('textpoint', true).append('text');

        join.order();

        join.each(function(d) {
            var g = d3.select(this);
            var sel = transition(g.select('text'));
            hasNode = Drawing.translatePoint(d, sel, xa, ya, gd);
>>>>>>> 121637d76... Merging initial.diff from WLChung

    cdscatter.forEach(function(d, i) {
        var trace = d[0].trace;
        if(!subTypes.hasMarkers(trace)) return;
        // if marker.maxdisplayed is used, select a maximum of
        // mnum markers to show, from the set that are in the viewport
        var mnum = trace.marker.maxdisplayed;

        // TODO: remove some as we get away from the viewport?
        if(mnum === 0) return;

        var cd = d.filter(function(v) {
                return v.x>=xr[0] && v.x<=xr[1] && v.y>=yr[0] && v.y<=yr[1];
            }),
            inc = Math.ceil(cd.length / mnum),
            tnum = 0;
        cdscatter.forEach(function(cdj, j) {
            var tracei = cdj[0].trace;
            if(subTypes.hasMarkers(tracei) &&
                    tracei.marker.maxdisplayed>0 && j<i) {
                tnum++;
            }
        });

<<<<<<< HEAD
        // if multiple traces use maxdisplayed, stagger which markers we
        // display this formula offsets successive traces by 1/3 of the
        // increment, adding an extra small amount after each triplet so
        // it's not quite periodic
        var i0 = Math.round(tnum*inc/3 + Math.floor(tnum/3) * inc/7.1);

        // for error bars: save in cd which markers to show
        // so we don't have to repeat this
        d.forEach(function(v) { delete v.vis; });
        cd.forEach(function(v, i) {
            if(Math.round((i + i0) % inc) === 0) v.vis = true;
        });
=======
        join.selectAll('text')
            .call(Drawing.textPointStyle, trace, gd)
            .each(function(d) {
                // This just *has* to be totally custom becuase of SVG text positioning :(
                // It's obviously copied from translatePoint; we just can't use that
                var x = xa.c2p(d.x);
                var y = ya.c2p(d.y);

                d3.select(this).selectAll('tspan.line').each(function() {
                    transition(d3.select(this)).attr({x: x, y: y});
                });
            });
        
            // find proper condition here
        if (!hasTransition) updateSpikeLinesWithoutPoints(gd, xa, ya);

        join.exit().remove();
    }

    points.datum(cdscatter);
    text.datum(cdscatter);
    makePoints(points, text, cdscatter);

    // lastly, clip points groups of `cliponaxis !== false` traces
    // on `plotinfo._hasClipOnAxisFalse === true` subplots
    var hasClipOnAxisFalse = trace.cliponaxis === false;
    var clipUrl = hasClipOnAxisFalse ? null : plotinfo.layerClipId;
    Drawing.setClipUrl(points, clipUrl, gd);
    Drawing.setClipUrl(text, clipUrl, gd);
}

function selectMarkers(gd, idx, plotinfo, cdscatter, cdscatterAll) {
    var xa = plotinfo.xaxis;
    var ya = plotinfo.yaxis;
    var xr = d3.extent(Lib.simpleMap(xa.range, xa.r2c));
    var yr = d3.extent(Lib.simpleMap(ya.range, ya.r2c));

    var trace = cdscatter[0].trace;
    if(!subTypes.hasMarkers(trace)) return;
    // if marker.maxdisplayed is used, select a maximum of
    // mnum markers to show, from the set that are in the viewport
    var mnum = trace.marker.maxdisplayed;

    // TODO: remove some as we get away from the viewport?
    if(mnum === 0) return;

    var cd = cdscatter.filter(function(v) {
        return v.x >= xr[0] && v.x <= xr[1] && v.y >= yr[0] && v.y <= yr[1];
    });
    var inc = Math.ceil(cd.length / mnum);
    var tnum = 0;
    cdscatterAll.forEach(function(cdj, j) {
        var tracei = cdj[0].trace;
        if(subTypes.hasMarkers(tracei) &&
                tracei.marker.maxdisplayed > 0 && j < idx) {
            tnum++;
        }
    });

    // if multiple traces use maxdisplayed, stagger which markers we
    // display this formula offsets successive traces by 1/3 of the
    // increment, adding an extra small amount after each triplet so
    // it's not quite periodic
    var i0 = Math.round(tnum * inc / 3 + Math.floor(tnum / 3) * inc / 7.1);

    // for error bars: save in cd which markers to show
    // so we don't have to repeat this
    cdscatter.forEach(function(v) { delete v.vis; });
    cd.forEach(function(v, i) {
        if(Math.round((i + i0) % inc) === 0) v.vis = true;
>>>>>>> 121637d76... Merging initial.diff from WLChung
    });
}
function updateSpikeLinesWithoutPoints(gd, xa, ya){
    if (gd === null || gd === undefined) return;

    var plotId = xa._id + ya._id;
    var plot = gd._fullLayout._plots[plotId];

    // Assuming there is only 1 line per plot.
    var lineElem = plot.plot[0][0].querySelectorAll('.lines .js-line');
    var isPointPresentInPlot = false;
    var traceChildNodes = lineElem[0].parentElement.parentElement.children;
    for (var i = 0; i < traceChildNodes.length; i++) {
        if (traceChildNodes[i].className == "points") {
          isPointPresentInPlot = traceChildNodes[i].children > 0;
          break;
        }        
    }
    if (isPointPresentInPlot) return;

    var spikeLines = gd._fullLayout._hoverlayer.selectAll('.spikeline')
        .filter('.' + plotId);

    if (spikeLines[0].length === 0) return;

    var xSpikeLines = spikeLines.filter('.' + xa._name);
    var ySpikeLines = spikeLines.filter('.' + ya._name);

    var xRange = xa._rl[1] - xa._rl[0];
    var yRange = ya._rl[1] - ya._rl[0];

    var yaxisHeight = ya._length;
    var yHeight = parseInt(xSpikeLines[0][0].getAttribute('y1'));

    var xaxisWidth = xa._length;
    var xWidth = parseInt(ySpikeLines[0][0].getAttribute('x1'));

    var dy = 0;
    var dx = 0;

    var previousDy = xSpikeLines[0][0].dy === undefined ? 0 : xSpikeLines[0][0].dy;
    var previousDx = ySpikeLines[0][0].dx === undefined ? 0 : ySpikeLines[0][0].dx;

    var py = xSpikeLines[0][0].getAttribute('py');
    var yRatio = 1 - ((py - ya._rl[0]) / yRange);
    var y0 = parseInt(xSpikeLines[0][0].getAttribute('y0'));

    var px = ySpikeLines[0][0].getAttribute('px');
    var xRatio = (px - xa._rl[0]) / xRange;
    var x0 = parseInt(ySpikeLines[0][0].getAttribute('x0'));

    dy = (yRatio * yaxisHeight) + y0 - (parseInt(xSpikeLines[0][0].getAttribute('y1')) + previousDy);
    dx = (xRatio * xaxisWidth) + x0 - (parseInt(ySpikeLines[0][0].getAttribute('x1')) + previousDx);

    Drawing.repositionPersistentSpikeLines(gd, px, py, dx, dy, xa, ya);
}
