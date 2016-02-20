import React, { Component, PropTypes } from 'react';
import { Grid, Row, Col } from 'react-bootstrap';

import Page from './Page';

class HomePage extends Component {
    static displayName = 'HomePage';

    displayName = 'HomePage';

    state = {
        imageSelected: false
    };

    handleClick (evt) {
        evt.preventDefault();
        this.setState({
            imageSelected: !this.state.imageSelected
        });
    };

    render () {
        let imgWrapProps = (this.state.imageSelected)
            // After an image selected, it gets moved to the left
            // side of the page and the controls show up on the right.
            ? { sm: 6 }

            // When an image isn't selected, the image select box
            // sits in the center of the page.
            : { sm: 8, smOffset: 2 };

        return (
            <Page>
                <Grid>
                    <Row>
                        <Col id="imgSelWrap" { ...imgWrapProps }>
                            <div id="imageSelect" onClick={::this.handleClick}>
                                <a href="" id="btnUpload">
                                    <div>
                                        Select an image
                                    </div>
                                </a>
                            </div>
                        </Col>
                    </Row>
                </Grid>
            </Page>
        );
    };

}

export default HomePage;