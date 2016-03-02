import React, { Component, PropTypes } from 'react';
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
        const { name, connectDragSource, isDragging } = this.props;
        return connectDragSource(
            <li className="algorithm">
                <span>{ name }</span>
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

class AlgorithmEditor extends Component {
    static displayName = 'AlgorithmEditor';

    static propTypes = {
        algorithms: PropTypes.arrayOf(PropTypes.component),

        // DND props
        onDropAlgorithm: PropTypes.func.isRequired,
    };

    render() {
        return (
            <div className="editor-wrap">
                <div className="algorithm-controls-wrap">
                    <div className="btn-scroll-left">
                        <i className="fa fa-angle-left" />
                    </div>

                    <div className="algorithms-wrap">
                        <ul className="algorithms">
                            <li className="algorithm">TEST</li>
                            <li className="algorithm">TEST</li>
                            <li className="algorithm">TEST</li>
                            <li className="algorithm">TEST</li>
                            <li className="algorithm">TEST</li>
                            <li className="algorithm">TEST</li>
                            <li className="algorithm">TEST</li>
                            <li className="algorithm">TEST</li>
                            <li className="algorithm">TEST</li>
                            <li className="algorithm">TEST</li>
                            <li className="algorithm">TEST</li>
                        </ul>
                    </div>

                    <div className="btn-scroll-right">
                        <i className="fa fa-angle-right" />
                    </div>
                </div>

                <div className="middle-line">
                    <hr/>
                </div>
            </div>
        );
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

    handleDropAlgorithm (
        dragIndex, // Index of the algo being dragged
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
                            .map((__, name) => ({ name }))
                            .map(({ name }, index) => {
                                return <AlgorithmBox key={name} name={name} index={index}
                                                     onDrop={::this.handleDropAlgorithm} />
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
