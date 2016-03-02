import _ from 'underscore';

import algorithms, { Algorithm } from '../core/algorithms';

import React, { Component, PropTypes } from 'react';
import { Grid, Row, Col, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Motion, spring } from 'react-motion';

import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

import Page from './Page';
import ImageViewer from './ImageViewer';
import AlgorithmSelector from './AlgorithmSelector';

function arrayBufferToBase64 (buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

class HomePage extends Component {
    static displayName = 'HomePage';

    state = {
        selectedImage: null,
        imageString: null,
        filename: null,
    };

    handleSelectFile (file) {
        // TODO: implement as a Web Worker so the UI doesn't block and freeze up.
        setTimeout(() => {
            let reader = new FileReader();
            reader.onload = (e) => {
                let imageString = arrayBufferToBase64(e.target.result);
                return this.setState({
                    filename: file.name,
                    selectedImage: e.target.result,
                    imageString,
                });
            };
            reader.readAsArrayBuffer(file);
        }, 0);
    };

    render () {
        let imageSelectProps = (this.state.selectedImage)
            // After an image selected, it gets moved to the left
            // side of the page and the controls show up on the right.
            ? {sm: 6}

            // When an image isn't selected, the image select box
            // sits in the center of the page.
            : {sm: 8, smOffset: 2};

        // Show the image preview if an image is selected
        let viewerProps = (this.state.selectedImage) ?
            {
                imageURI: "data:image/jpeg;base64," + this.state.imageString,
                imageName: this.state.filename,
            } :
            {};

        let animationCSS = (x, opacity) => ({
            transform: `translate3d(${x}px, 0, 0)`,
            opacity
        });

        let algorithmStyle = (this.state.selectedImage) ?
        {
            x: spring(0),
            opacity: spring(1)
        } :
        {
            x: spring(800),
            opacity: spring(0)
        };

        // Props to animate the algo list
        let motionProps = {
            defaultStyle: {
                x: 800,
                opacity: 0
            },
            style: algorithmStyle
        };

        return (
            <Page>
                <Grid>
                    <Row>
                        <Col id="image-select-wrap" { ...imageSelectProps }>
                            <HomePage.Instruction
                                text="step 1. select an image"
                                tooltip='select an image from your computer to corrupt' />

                            <ImageViewer onSelectImage={::this.handleSelectFile} { ...viewerProps } />
                        </Col>
                        {
                            // The algo animations are disabled for development
                            /*(this.state.selectedImage) ?
                                <Motion { ...motionProps }>
                                    {
                                        ({x, opacity}) => (*/
                                            <Col sm={6} /*style={animationCSS(x, opacity)}*/>
                                                <HomePage.Instruction
                                                    text="step 2. add some filters"
                                                    tooltip={`drag some filters to the bar
                                                              below. arrange them in
                                                              whatever order you'd like`} />
                                                <AlgorithmSelector algorithms={algorithms}/>
                                            </Col>/*
                                        )
                                    }
                                </Motion> /*:
                                null // Don't show the algos if an image isn't selected
                                */
                        }
                    </Row>
                </Grid>
            </Page>
        );
    };

    static Instruction = ({ text, tooltip, placement = 'top' }) => (
        <h3 className="instructions">
            { text }
            <OverlayTrigger placement={placement} overlay={<Tooltip>{tooltip}</Tooltip>}>
                <i className='fa fa-question-circle' />
            </OverlayTrigger>
        </h3>
    );
}

// Wrap HomePage in react-dnd context wrapper to support dnd on children.
export default DragDropContext(HTML5Backend)(HomePage);
