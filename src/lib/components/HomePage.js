import React, { Component, PropTypes } from 'react';
import { Grid, Row, Col } from 'react-bootstrap';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import Page from './Page';

import Notification from './Notification';

class HomePage extends Component {
    static displayName = 'HomePage';

    state = {
        imageSelected: false,
        notifications: [],
    };

    handleClick (evt) {
    };

    handleSelectFile (evt) {
        console.log('selected file:');
        console.log(evt.target.files[0]);

        this.setState({
            imageSelected: !this.state.imageSelected
        });
    };

    addNot () {
        this.setState({
            notifications: this.state.notifications.concat('Another note: ' + Date.now())
        });
    };

    render () {
        let imageSelectProps = (this.state.imageSelected)
            // After an image selected, it gets moved to the left
            // side of the page and the controls show up on the right.
            ? { sm: 6 }

            // When an image isn't selected, the image select box
            // sits in the center of the page.
            : { sm: 8, smOffset: 2 };

        return (
            <Page>
                <Grid>
                    <a onClick={::this.addNot}>ADD NOT</a>
                    <Row>
                        <Col id="imgSelWrap" { ...imageSelectProps }>
                            <form id="imageSelect" onClick={::this.handleClick}
                                  encType="multipart/form-data">
                                <a href="javascript:void(0);" id="btnUpload">
                                    <div>
                                        Select an image
                                        <input type="file"
                                               onChange={::this.handleSelectFile} />
                                    </div>
                                </a>
                            </form>

                            <Notification duration={3000} message="this is atest" />

                            {
                                this.state.notifications.map(message =>
                                    <Notification duration={3000} message={message} />
                                )
                            }

                        </Col>
                    </Row>
                </Grid>
            </Page>
        );
    };

}

export default HomePage;