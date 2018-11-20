import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import * as d3 from 'd3';
import './ultrapiechart.css';

var margin = {top:80, left: 80, right: 80, bottom: 80};
var height = 400 - margin.top - margin.bottom;
var width = 400 - margin.left - margin.right;
var radius = width / 2;
var innerRadius = 60;

var BackCircle = () => {
    let arc = d3.arc().innerRadius(innerRadius + 10).outerRadius(radius - 10);
    let pie = d3.pie()([1]);
    return <path fill="#777" d={arc(pie[0])}></path>
}

export default class UltraPieChart extends Component {
    state = {
        expanded: '',
        height: 0,
        width: 0,
    }
    constructor() {
        super();
        this.arc = d3.arc().innerRadius(innerRadius).outerRadius(radius);
        this.outArc = d3.arc().innerRadius(radius + 5).outerRadius(radius + 10);
        this.coverArc = d3.arc().innerRadius(innerRadius).outerRadius(radius + 5);
        this.labelArc = d3.arc().innerRadius(radius * .7).outerRadius(radius * .8);
        this.outLabelArc = d3.arc().innerRadius(radius + 50).outerRadius(radius + 50);
        this.arcs = d3.pie().padAngle(.05).value(f => f.value);
    }
    componentDidMount() {
        let el = ReactDOM.findDOMNode(this), pn = el.parentNode;
        let height = pn.offsetHeight - margin.top - margin.bottom,
            width = pn.offsetWidth - margin.left - margin.right,
            radius = width / 2,
            innerRadius = 50;
        this.setState({height,width,radius,innerRadius});
    }
    pointArc(d) {
        return d3.pie()
            .startAngle(d.startAngle + .02)
            .endAngle(d.endAngle - .02)
            .value(f => f.value);
    }
    pointColors(domain) {
        return d3.scaleOrdinal(d3.schemeCategory10).domain(domain);
    }
    lineArc(type, d) {
        if(type == 1) {
            return d3.arc().innerRadius(radius + 10).outerRadius(radius + 10).centroid(d);
        } else if(type == 2) {
            return d3.arc().innerRadius(radius + 20).outerRadius(radius + 20).centroid(d);
        } else if(type == 3) {
            return d3.arc().innerRadius(radius + 20).outerRadius(radius + 20).centroid(d);
        }
    }
    renderSvgContents() {
        let config = this.props.config;
        let data = config.data;
        var color = d3.scaleOrdinal(['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#e67e22', '#e74c3c', '#95a5a6', '#34495e', '#f1c40f'])
            .domain(data.map(d => d.name));
        let pieData = this.arcs(data);
        let {height,width,radius,innerRadius} = this.state;
        return (
            <svg height={height + margin.top + margin.bottom} width={width + margin.left + margin.right}>
                <filter id="dropshadow" height="130%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                    <feOffset dx="0" dy="0" result="offsetblur"/>
                    <feComponentTransfer>
                        <feFuncA type="linear" slope="0.5"/>
                    </feComponentTransfer>
                    <feMerge> 
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
                <text x={(margin.left+width+margin.right)/2} y={(margin.top+height+margin.bottom)/2+5} textAnchor="middle">{config.name}</text>
                <g transform={`translate(${(width / 2) + margin.left}, ${(height / 2) + margin.top})`} ref="g">
                    <BackCircle />
                    {pieData.map((d, i) => {
                        let midAngle = (d) => {
                            return d.startAngle + (d.endAngle - d.startAngle) / 2;
                        }
                        let polyLine = (d) => {
                            let points = this.lineArc(2, d);
                            // points[0] = radius * 1.2 * (midAngle(d) < Math.PI ? 1 : -1);
                            points[0] = points[0] + (midAngle(d) < Math.PI ? 10 : -10);
                            return <polyline key={`${d.data.name}-poly`} points={[this.lineArc(1, d), this.lineArc(2, d), points]}></polyline>
                        }
                        let textPos = (d) => {
                            let hma = midAngle(d);
                            let vma = d.startAngle + (d.endAngle - d.startAngle) / 2;
                            let points = this.lineArc(3, d);
                            points[1] = points[1] + (vma < Math.PI / 2 || vma > Math.PI + Math.PI / 2 ? -5 : 15);
                            // points[0] = radius * .95 * (ma < Math.PI ? 1 : -1);
                            let style = {};
                            if(hma > Math.PI) {
                                style.textAnchor = 'end';
                            }
                            return <text {...{style}} key={`${d.data.name}-text`} transform={`translate(${points})`} className="tt">{d.data.name}</text>
                        }
                        let onMouseOver = () => this.setState({expanded:d.data.name});
                        let onMouseOut = () => this.setState({expanded:''});
                        let onClick = () => {
                            if(config.selected) config.selected({name:d.data.name});
                        }
                        let hovered = this.state.expanded == d.data.name;
                        let items = [
                            <path className={'upc-arc' + (hovered ? ' hov' : '')} key={d.data.name} fill={color(d.data.name)} d={this.arc(d)} opacity={.9}></path>,
                            <path {...{onMouseOver,onMouseOut,onClick}} key={`${d.data.name}-cover`} fill="transparent" d={this.coverArc(d)}><title>{`${d.data.name} : ${d.data.value}`}</title></path>,
                            // <text key={`${d.data.name}-text`} transform={`translate(${this.labelArc.centroid(d)})`}>{d.data.name}</text>
                        ];
                        if(false && !hovered) {
                            items = items.concat([
                                polyLine(d),
                                textPos(d)
                            ])
                        }
                        // if(hovered) items.push(<text key={`${d.data.name}-label`} className="out-lbl" transform={`translate(${this.outLabelArc.centroid(d)})`}>{d.data.name}</text>);
                        if(d.data.points) {
                            let points = this.pointArc(d)(d.data.points);
                            let pColor = this.pointColors(d.data.points.map(p => p.name));
                            points.forEach((p, i) => {
                                // if(hovered) items.push(textPos(p));
                                // if(hovered) items.push(polyLine(p));
                                if(hovered) items.push(<path key={`${d.data.name}-${p.data.name}`} fill={pColor(p.data.name)} d={this.outArc(p)}></path>);
                                items.push(<path {...{onMouseOver,onMouseOut}} key={`${d.data.name}-${p.data.name}-edge`} fill="transparent" d={this.outArc(p)}><title>{`${p.data.name} : ${p.data.value}`}</title></path>);
                            });
                        }
                        return <g key={i}>{items}</g>;
                    })}
                </g>
            </svg>
        )
    }
    render() {
        return (
            <div className="upc-con">{this.renderSvgContents()}</div>
        )
    }
}