import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import * as d3 from 'd3';
import './ultrapiechart.css';

var margin = {top:60, left: 80, right: 80, bottom: 100};
var width = 360 - margin.left - margin.right;
var radius = width / 2;
var innerRadius = 55;

var BackCircle = () => {
    let arc = d3.arc().innerRadius(innerRadius + 6).outerRadius(radius - 6);
    let pie = d3.pie()([1]);
    return <path fill="#777" d={arc(pie[0])}></path>
}

export default class UltraPieChart extends Component {
    state = {
        expanded: '',
        height: 0,
        width: 0,
        focused: '',
        focusedC: '',
    }
    constructor() {
        super();
        this.arc = d3.arc().innerRadius(innerRadius).outerRadius(radius).cornerRadius(3);
        this.outArc = d3.arc().innerRadius(radius + 5).outerRadius(radius + 10);
        this.coverArc = d3.arc().innerRadius(innerRadius).outerRadius(radius + 5);
        this.labelArc = d3.arc().innerRadius(radius * .7).outerRadius(radius * .8);
        this.outLabelArc = d3.arc().innerRadius(radius + 50).outerRadius(radius + 50);
        this.arcs = d3.pie().padAngle(.025).value(f => f.value);
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
    clickOut = () => {
        let config = this.props.config;
        if(!config.disableTrack && this.state.focused) {
            this.setState({focused:'',focusedC:''});
            if(config.selected) config.selected(null);
        }
    }
    renderSvgContents(color) {
        let config = this.props.config;
        let data = config.data;
        let pieData = this.arcs(data);
        let {height,width} = this.state;
        let clickOut = this.clickOut;
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
                <text x={margin.left+width/2} y={margin.top+height/2+5} textAnchor="middle">{config.name}</text>
                <rect onClick={clickOut} width={width+margin.left+margin.right} height={height+margin.top+margin.bottom} fill="transparent"></rect>
                <g transform={`translate(${(width / 2) + margin.left}, ${(height / 2) + margin.top})`} ref="g">
                    <BackCircle />
                    {pieData.map((d, i) => {
                        let onMouseOver = () => this.setState({expanded:d.data.name});
                        let onMouseOut = () => this.setState({expanded:''});
                        let onClick = () => {
                            if(!config.disableTrack && this.state.focused != d.data.name) {
                                if(config.selected) config.selected(d.data);
                                setTimeout(() => this.setState({focused:d.data.name,focusedC:''}), 50);
                            }
                        }
                        let hovered = this.state.expanded == d.data.name;
                        let clicked = this.state.focused == d.data.name;
                        let items = [
                            <path className={['upc-arc', hovered && 'hov', clicked && 'clk'].filter(f => f).join(' ')} key={`${d.data.name}${i}`} fill={d.data.color || color(d.data.name)} d={this.arc(d)} opacity={.9}></path>,
                            <path className="upc-arc-cov" {...{onMouseOver,onMouseOut,onClick}} key={`${d.data.name}${i}-cover`} fill="transparent" d={this.coverArc(d)}><title>{`${d.data.name} : ${d.data.value}`}</title></path>,
                        ];
                        let content = [<g key={i + 'pie'}>{items}</g>];
                        return content;
                    })}
                </g>
                {this.state.focused && <rect className="ptcvr" width="20" height={height} x={width + margin.left + margin.right - 30} y={margin.top}></rect>}
                {pieData.map((d, i) => {
                    let hovered = d.data.name == this.state.focused;
                    let content = [];
                    if(d.data.points && hovered) {
                        let linebar = [];
                        linebar.lastY = margin.top;
                        let points = d.data.points;
                        let _width = width + margin.left + margin.right;
                        let pSum = points.reduce((carry, p) => carry + p.value, 0);
                        let dx = d3.scaleLinear().range([0, height]).domain([0, pSum]);
                        let color = this.pointColors(points.map(f => f.name));
                        for(let p in points) {
                            let point = points[p];
                            let y = linebar.lastY;
                            let ph = dx(point.value);
                            let onClick = () => {
                                if(!config.disableTrack && this.state.focusedC != point.name) {
                                    if(config.selected) config.selected(point, true);
                                    setTimeout(() => this.setState({focused:d.data.name,focusedC:point.name}), 50);
                                }
                            }
                            linebar.push(<rect key={i+'points'+p} className={this.state.focusedC == point.name ? 'act' : null} onClick={onClick} fill={point.color || color(point.name)} width={20} height={ph} x={_width - 30} y={y}><title>{`${point.name} - ${point.value}`}</title></rect>);
                            linebar.lastY = ph + linebar.lastY;
                        }
                        content.push(<g key={i+'linebar'} className="linebar">{linebar}</g>);
                    }
                    return content;
                })}
            </svg>
        )
    }
    render() {
        let data = this.props.config.data;
        var color = d3.scaleOrdinal(['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#e67e22', '#e74c3c', '#95a5a6', '#34495e', '#f1c40f'])
            .domain(data.map(d => d.name));
        return (
            <div className="upc-con">
                {this.renderSvgContents(color)}
                <div className="upc-ftl">
                    {data.map((d, i) => {
                        let text = d.name + ' : ' + d.value;
                        return <span className="upc-ftt" key={i}>
                            <span className="upc-ftll" style={{background:d.color || color(i)}}></span>
                            <span className="upc-ftlt" style={{color:d.color || color(i)}}>{text} </span>
                        </span>;
                    })}
                </div>
            </div>
        )
    }
}