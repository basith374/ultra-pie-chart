import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import * as d3 from 'd3';
import './ultrapiechart.css';

var BackCircle = (props) => {
    let {innerRadius, radius} = props;
    let arc = d3.arc().innerRadius(innerRadius + 6).outerRadius(radius - 6);
    let pie = d3.pie()([1]);
    return <path fill="#777" d={arc(pie[0])}></path>
}

export default class UltraPieChart extends Component {
    state = {
        expanded: '',
        height: 0,
        width: 0,
        margin: {},
        focused: '',
        focusedC: '',
    }
    constructor() {
        super();
        this.arc = d3.arc().cornerRadius(3);
        this.outArc = d3.arc();
        this.coverArc = d3.arc();
        this.labelArc = d3.arc();
        this.outLabelArc = d3.arc();
        this.arcs = d3.pie().padAngle(.025).value(f => f.value);
    }
    componentDidMount() {
        let {radius, innerRadius} = this.resized();
        this.arc.innerRadius(innerRadius).outerRadius(radius);
        this.outArc.innerRadius(radius + 5).outerRadius(radius + 10);
        this.coverArc.innerRadius(innerRadius).outerRadius(radius + 5);
        this.outLabelArc.innerRadius(radius * .7).outerRadius(radius * .8);
        window.addEventListener('resize', this.resized);
    }
    componentWillUnmount() {
        window.removeEventListener('resize', this.resized);
    }
    resized = () => {
        let el = ReactDOM.findDOMNode(this), pn = el.parentNode;
        let margin = {
            top: pn.offsetHeight * 10 / 100,
            left: pn.offsetWidth * 10 / 100,
            right: pn.offsetWidth * 10 / 100,
            bottom: pn.offsetHeight * 10 / 100,
        }
        let height = pn.offsetHeight,
            width = pn.offsetWidth;
        height = height - margin.top - margin.bottom - 70;
        width = width - margin.left - margin.right;
        let radius = Math.min(height / 2, width / 2),
            innerRadius = radius * .5;
        this.setState({height,width,radius,innerRadius,margin});
        return {height, width, radius, innerRadius, margin};
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
    clickOut = () => {
        let config = this.props.config;
        if(!config.disableTrack && this.state.focused) {
            this.setState({focused:'',focusedC:''});
            if(config.selected) config.selected(null);
        }
    }
    renderSvgContents(color, pieData) {
        let config = this.props.config;
        let {height,width,radius,innerRadius,margin} = this.state;
        let clickOut = this.clickOut;
        let showTooltip = (show = true) => {
            let el = ReactDOM.findDOMNode(this);
            let tar = el.querySelector('.upc-ttx');
            tar.style.display = show ? 'block' : 'none';
        }
        let changeTooltip = (text, x, y) => {
            let el = ReactDOM.findDOMNode(this);
            let rect = el.getBoundingClientRect();
            let offset = {
                top: rect.top + document.body.scrollTop,
                left: rect.left + document.body.scrollLeft,
            }
            x -= offset.left;
            y -= offset.top;
            let tar = el.querySelector('.upc-ttx');
            tar.innerText = text;
            tar.style.top = y + 'px';
            let w = width + margin.left + margin.right;
            if(x > w / 2) {
                tar.style.right = (w - (x - 15))  + 'px';
                tar.style.left = 'auto';
            } else {
                tar.style.left = (x + 15) + 'px';
                tar.style.right = 'auto';
            }
        }
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
                    <BackCircle {...{radius,innerRadius}} />
                    {pieData.map((d, i) => {
                        let onMouseOver = (e) => {
                            this.setState({expanded:d.data.name});
                            showTooltip();
                        }
                        let onMouseOut = () => {
                            this.setState({expanded:''});
                            showTooltip(false);
                        };
                        let onMouseMove = e => {
                            let text = d.data.name + ' : ' + d.data.value
                            changeTooltip(text, e.clientX, e.clientY);
                        }
                        let onClick = () => {
                            if(!config.disableTrack && this.state.focused != d.data.name) {
                                if(config.selected) config.selected(d.data);
                                setTimeout(() => this.setState({focused:d.data.name,focusedC:''}), 50);
                            }
                        }
                        let clicked = this.state.focused == d.data.name;
                        let cls = ['upc-arc', clicked && 'clk'].filter(f => f).join(' ');
                        return <path key={`${d.data.name}${i}`}
                            {...{onMouseOver,onMouseOut,onClick,onMouseMove}}
                            className={cls}
                            fill={d.data.color || color(d.data.name)}
                            d={this.arc(d)}
                            opacity={.9}>
                            </path>
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
                            let onMouseOver = () => showTooltip();
                            let onMouseMove = (e) => {
                                let text = point.name + ' : ' + point.value;
                                changeTooltip(text, e.clientX, e.clientY);
                            }
                            let onMouseOut = () => showTooltip(false);
                            let rect = <rect key={i+'points'+p}
                                className={this.state.focusedC == point.name ? 'act' : null}
                                {...{onClick, onMouseOver, onMouseMove, onMouseOut}}
                                fill={point.color || color(point.name)}
                                width={20}
                                height={ph}
                                x={_width - 30}
                                y={y}></rect>;
                            linebar.push(rect);
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
        let pieData = this.arcs(data);
        var color = d3.scaleOrdinal(['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#e67e22', '#e74c3c', '#95a5a6', '#34495e', '#f1c40f'])
            .domain(data.map(d => d.name));
        let {radius} = this.state;
        return (
            <div className="upc-con">
                {radius && this.renderSvgContents(color, pieData)}
                <div className="upc-ftl">
                    {data.map((d, i) => {
                        let text = d.name + ' : ' + d.value;
                        return <span className="upc-ftt" key={i}>
                            <span className="upc-ftll" style={{background:d.color || color(i)}}></span>
                            <span className="upc-ftlt" style={{color:d.color || color(i)}}>{text} </span>
                        </span>;
                    })}
                </div>
                <div className="upc-ttx" style={{display:'none'}}></div>
            </div>
        )
    }
}