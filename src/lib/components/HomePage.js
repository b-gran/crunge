import _ from 'underscore';

import algorithms from '../core/algorithms';

import React, { Component, PropTypes } from 'react';
import { Grid, Row, Col } from 'react-bootstrap';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import { Motion, spring } from 'react-motion';

import Page from './Page';

import ImageViewer from './ImageViewer';

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
            ? {sm: 6 }

            // When an image isn't selected, the image select box
            // sits in the center of the page.
            : {sm: 8, smOffset: 2};

        // Show the image preview if an image is selected
        let viewerProps =
            (this.state.selectedImage) ?
            {
                imageURI: "data:image/jpeg;base64," + this.state.imageString,
                imageName: this.state.filename,
            } :
            {};

        let Algorithm = (props) => (
            <li className="algorithm">
                <span>{ props.name }</span>
            </li>
        );

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
                            <h3 className="instructions">step 1. select an image</h3>
                            <ImageViewer onSelectImage={::this.handleSelectFile} { ...viewerProps } />
                        </Col>
                        {
                            (this.state.selectedImage) ?
                                <Motion { ...motionProps }>
                                    {
                                        ({x, opacity}) => (
                                            <Col sm={6} style={animationCSS(x, opacity)}>
                                                <h3 className="instructions">step 2. add some filters</h3>
                                                <ul className="algorithm-list">
                                                    {
                                                        _.map(algorithms, (__, name) => {
                                                            return <Algorithm key={name} name={name}/>
                                                        })
                                                    }
                                                </ul>
                                            </Col>
                                        )
                                    }
                                </Motion> :
                                null // Don't show the algos if an image isn't selected
                        }
                    </Row>
                </Grid>
            </Page>
        );
    };
}

function arrayBufferToBase64 (buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

export default HomePage;