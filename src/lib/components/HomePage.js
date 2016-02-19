import React, { Component, PropTypes } from 'react';
import { Grid, Row, Col } from 'react-bootstrap';

import Page from './Page';

class HomePage extends Component {

    render () {
        return (
            <Page>
                <Row>
                    <Col md={12}>
                        Hello, world!
                    </Col>
                </Row>
            </Page>
        );
    };

}

export default HomePage;