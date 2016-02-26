import _ from 'underscore';

import algorithms from '../core/algorithms';

import React, { Component, PropTypes } from 'react';
import { Grid, Row, Col } from 'react-bootstrap';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import Page from './Page';

import { Notification, NotificationStack } from './Notification';

class ImageViewer extends Component {
    static displayName = 'ImageViewer';

    static propTypes = {
        // Handler to call when a new image is selected
        // The function signature should be:
        //      function onSelectImage (file) { ... }
        //          where file is an instance of File (see MDN)
        onSelectImage: PropTypes.func.isRequired,

        // The currently selected image as a URI.
        // This image is a prop, not state; the parent must explicitly
        // set an image. If an image is not provided, an image selection
        // UI will be shown.
        imageURI: PropTypes.string,
        imageName: PropTypes.string,
    };

    constructor (props) {
        super(props);

        if (props.imageURI && !props.imageName)
            throw new Error('An image is required if an image is provided.');
    };

    state = {
        errors: [],
    };

    static errorTypes = {
        invalidFileType: 'the image must be a .jpg or .jpeg'
    };

    onDismissError (index) {
        // Remove the element without mutating state.
        let errors = (() => {
            let copy = this.state.errors.slice();
            copy.splice(index, 1);
            return copy;
        })();

        return this.setState({
            errors
        });
    };

    handleSelectFile (evt) {
        evt.preventDefault();

        let file = evt.target.files[0];
        if (!file) {
            return this.setState({
                errors: [],
            });
        }

        let ext = fileExt(file.name).toLowerCase();

        // Display an error if the file isn't a JPEG
        if (!['jpg', 'jpeg'].includes(ext)) {
            // Don't display the error more than once.
            if (this.state.errors.includes(ImageViewer.errorTypes.invalidFileType)) return;

            let errors = this.state.errors.concat(ImageViewer.errorTypes.invalidFileType);
            return this.setState({errors});
        }

        this.props.onSelectImage(file);
    };

    render () {
        let content = (() => {
            // Display the image if the user has selected one.
            if (this.props.imageURI)
                return <ImageViewer.Image imageName={this.props.imageName}
                              imageURI={this.props.imageURI}
                              onSelectFile={::this.handleSelectFile} />;

            // Show an image selection button if not.
            return <ImageViewer.SelectButton onSelectFile={::this.handleSelectFile} />;
        })();

        return (
            <div>
                {
                    (() => {
                        // Display the image if the user has selected one.
                        if (this.props.imageURI)
                            return <ImageViewer.Image imageName={this.props.imageName}
                                                      imageURI={this.props.imageURI}
                                                      onSelectFile={::this.handleSelectFile} />;

                        // Show an image selection button if not.
                        return <ImageViewer.SelectButton onSelectFile={::this.handleSelectFile} />;
                    })()
                }

                <NotificationStack>
                    {
                        this.state.errors.map((msg, idx) => {
                            return <Notification key={msg} message={msg} dismissible
                                                 onDismiss={this.onDismissError.bind(this, idx)}/>
                        })
                    }
                </NotificationStack>
            </div>
        );
    }

    // Component representing a selected image.
    static Image = (props) => (
        <div className="image-viewer">
            <div className="title">
                                <span>
                                    { props.imageName }
                                </span>
            </div>

            <img className="main-image" src={props.imageURI}
                 style={{ maxWidth: '100%', maxHeight: '300px' }}/>

            <label className="select-new-image">
                choose a new image
                <input type="file" accepts="image/*"
                       onChange={props.onSelectFile}/>
            </label>
        </div>
    );

    // A button for selecting an image when one is not already selected.
    static SelectButton = (props) => (
        <form id="image-select" encType="multipart/form-data"
              onSubmit={(evt) => console.log(evt)}>
            <a href="javascript:void(0);" id="btnUpload">
                <div>
                    Select an image
                    <input type="file" accepts="image/*"
                           onChange={props.onSelectFile}/>
                </div>
            </a>
        </form>
    );
}

class HomePage extends Component {
    static displayName = 'HomePage';

    state = {
        selectedImage: null,
        imageString: null,
        filename: null,

        imageSelectErrors: {
            fileType: false,
        }
    };

    handleSelectFile (file) {
        setTimeout(() => {
            let reader = new FileReader();
            reader.onload = (e) => {
                console.log('loaded file');
                console.log(e);

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
        let viewerProps =
            (this.state.selectedImage) ?
            {
                imageURI: "data:image/jpeg;base64," + this.state.imageString,
                imageName: this.state.filename,
            } :
            {};

        return (
            <Page>
                <Grid>
                    <Row>
                        <Col id="image-select-wrap" { ...imageSelectProps }>
                            <ImageViewer onSelectImage={::this.handleSelectFile} { ...viewerProps } />
                        </Col>
                    </Row>
                    <Row>
                        <Col sm={12}>
                            <ul className="algorithm-list">
                                {
                                    _.map(algorithms, (_$, name) => {
                                        console.log(_$, name);
                                        return (
                                            <li className="algorithm">
                                                <span>{ name }</span>
                                            </li>
                                        )
                                    })
                                }
                            </ul>
                        </Col>
                    </Row>
                </Grid>
            </Page>
        );
    };
}

// Get the extension of a file.
function fileExt (filename) {
    return filename.substr(filename.lastIndexOf('.') + 1);
};

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