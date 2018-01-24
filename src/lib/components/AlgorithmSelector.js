import React, { Component, PropTypes } from 'react';
import update from 'react-addons-update';
import _ from 'lodash';

import algorithms, { Algorithm } from '../core/algorithms';

import { ItemTypes } from '../Constants';
import { DragSource } from 'react-dnd';

const algorithmSource = {
    beginDrag (props) {
        return {
            id: props.key,
            index: props.index
        }
    },
};

function collect (connect, monitor) {
    return {
        connectDragSource: connect.dragSource(),
        isDragging: monitor.isDragging(),
    };
}

class AlgorithmBox extends Component {
    static displayName = 'AlgorithmBox';

    static propTypes = {
        // DND props
        connectDragSource: PropTypes.func.isRequired,
        isDragging: PropTypes.bool.isRequired,
    };

    render () {
        const { name, children, connectDragSource, isDragging } = this.props;
        return connectDragSource(
            <li className="algorithm">
                { children || name }
            </li>
        );
    };
}

// Makes instances of AlgorithmBox draggable.
AlgorithmBox = DragSource(ItemTypes.ALGORITHM, algorithmSource, collect)(AlgorithmBox);

const editorTarget = {
    drop (props, monitor) {
        props.handleDropAlgorithm();
    },
};

const SCROLL_LEFT = 'left',
    SCROLL_RIGHT = 'right';

class AlgorithmEditor extends Component {
    static displayName = 'AlgorithmEditor';

    static propTypes = {
        algorithms: PropTypes.arrayOf(PropTypes.component),

        // DND props
        onDropAlgorithm: PropTypes.func.isRequired,
    };

    state = {
        // x-axis position of the slider
        x: 0,

        // id of the scroll interval.
        // 0 if no interval.
        scroll: {
            left: 0,
            right: 0,
        },
    };

    beginScroll (direction) {
        const multiplier =
            (direction === SCROLL_RIGHT)
                ? 1
                : -1;

        const id = window.setInterval(() => {
            console.log('scrolling + ' + direction);
            this.setState({
                x: this.state.x + 10 * multiplier,
            });
        }, 100);

        console.log('starting sscroll');

        this.setState(update(this.state, {
            scroll: {
                [direction]: {
                    $set: id
                }
            }
        }));
    };

    endScroll (direction) {
        console.log('ending scroll');
        if (this.state.id) {
            window.clearInterval(this.state.id);
            this.setState(
                update(this.state, {
                        scroll: {
                            [direction]: {
                                $set: 0
                            }
                        }
                    }
                ));
        }
    };

    /*
     *  onClick onContextMenu onDoubleClick onDrag onDragEnd
     *  onDragEnter onDragExit onDragLeave onDragOver
     *  onDragStart onDrop onMouseDown onMouseEnter
     *  onMouseLeave onMouseMove onMouseOut onMouseOver
     *  onMouseUp
     */

    render () {
        return (
            <div className="editor-wrap">
                <div className="algorithm-controls-wrap">
                    <div className="btn-scroll-left"
                         onMouseDown={this.beginScroll.bind(this, SCROLL_LEFT)}
                         onMouseUp={this.endScroll.bind(this, SCROLL_LEFT)}
                         onMouseLeave={this.endScroll.bind(this, SCROLL_LEFT)}>
                        <i className="fa fa-angle-left"/>
                    </div>

                    <div className="algorithms-wrap">
                        <ul className="algorithms">
                            {
                                _.times(15, idx => (
                                    <AlgorithmBox key={idx} className="algorithm">
                                        { `TestAlgo${idx}` }
                                    </AlgorithmBox>
                                ))
                            }
                        </ul>
                    </div>

                    <div className="btn-scroll-right"
                         onMouseDown={this.beginScroll.bind(this, SCROLL_RIGHT)}
                         onMouseUp={this.endScroll.bind(this, SCROLL_RIGHT)}
                         onMouseLeave={this.endScroll.bind(this, SCROLL_RIGHT)}>
                        <i className="fa fa-angle-right"/>
                    </div>
                </div>

                <div className="middle-line">
                    <hr/>
                </div>
            </div>
        );
    };
}

class ClickAndHoldable extends Component {
    static displayName = 'ClickAndHoldable';

    static propTypes = {
        // How often the hold event fires
        holdEventFrequency: PropTypes.number,

        // Handlers for hold and click events
        onClick: PropTypes.func,
        onHold: PropTypes.func,
    };

    static defaultProps = {
        ...Component.defaultProps,

        holdEventFrequency: 250,
        onClick: () => undefined,
        onHold: () => undefined,
    };

    state = {
        isMouseDown: false,
        timer: undefined,
    };

    // Set up hold timer before component mounts.
    componentWillMount () {
        const timer = window.setInterval(() => {
            this.props.onHold();
        }, this.props.holdEventFrequency);

        return this.setState({
            timer
        });
    };

    // Tear down timer when component is unmounting
    componentWillUnmount () {
        if (!this.state.timer) return;

        return window.clearInterval(this.state.timer);
    };

    /*
     *  onClick onContextMenu onDoubleClick onDrag onDragEnd
     *  onDragEnter onDragExit onDragLeave onDragOver
     *  onDragStart onDrop onMouseDown onMouseEnter
     *  onMouseLeave onMouseMove onMouseOut onMouseOver
     *  onMouseUp
     */

    handleMouseDown () {
        return this.setState({
            isMouseDown: true,
        });
    };

    handleMouseUp () {
        return this.setState({
            isMouseDown: false,
        });
    };

    render () {
        return (
            <div onMouseDown={::this.handleMouseDown} onMouseUp={::this.handleMouseUp}>
                { this.props.children }
            </div>
        )
    };
}

class AlgorithmSelector extends Component {
    static displayName = 'AlgorithmSelector';

    static propTypes = {
        algorithms: PropTypes.objectOf(PropTypes.instanceOf(Algorithm)),
    };

    constructor (props) {
        super(props);
    };

    handleDropAlgorithm (dragIndex, // Index of the algo being dragged
                         hoverIndex // Index the algo has been dragged into
    ) {
        console.log(dragIndex, hoverIndex);
    }

    render () {
        return (
            <div>
                <ul className="algorithm-list">
                    {
                        _(this.props.algorithms)
                            .chain()
                            .map((__, name) => ({name}))
                            .map(({ name }, index) => {
                                return <AlgorithmBox key={name} name={name} index={index}
                                                     onDrop={::this.handleDropAlgorithm}/>
                            })
                            .value()
                    }

                </ul>
                <AlgorithmEditor />
            </div>
        );
    };

}

export default DragSource(ItemTypes.ALGORITHM, algorithmSource, collect)(AlgorithmSelector);
