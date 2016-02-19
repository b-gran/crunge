import React, { Component, PropTypes } from 'react';
import { Grid, Row, Col } from 'react-bootstrap';

import Page from './Page';

class HomePage extends Component {

    render () {
        return (
            <Page>
                <Grid>
                    <Row>
                        <Col md={12}>
                            <div id="imageSelect">
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